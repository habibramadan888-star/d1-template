import { filsToAedString, parseAedToFils, toSafeSqlInteger } from "./money.mjs";

const FIELD_PATTERN = /^[a-z][a-z0-9_]*$/;

function issue(code, message, extra = {}) {
  return { code, message, ...extra };
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function normalizeFieldName(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  const field = value.trim();
  if (!FIELD_PATTERN.test(field)) throw new Error(`Unsafe field name for ${label}: ${value}`);
  return field;
}

function defaultFilsField(legacyField) {
  return legacyField.endsWith("_aed") ? `${legacyField.slice(0, -4)}_fils` : `${legacyField}_fils`;
}

export function normalizeMoneyFieldSpec(spec) {
  const item = typeof spec === "string" ? { legacyField: spec } : assertObject(spec, "field spec");
  const legacyField = normalizeFieldName(
    item.legacyField ?? item.field ?? item.legacy,
    "legacyField"
  );
  const filsField = normalizeFieldName(
    item.filsField ?? defaultFilsField(legacyField),
    "filsField"
  );
  if (!filsField.endsWith("_fils")) {
    throw new Error(`Dual-write target must end with _fils: ${filsField}`);
  }
  return {
    legacyField,
    filsField,
    required: Boolean(item.required),
    allowNegative: Boolean(item.allowNegative),
    context: item.context || legacyField
  };
}

function normalizeLegacyInput(value, context) {
  if (value === null || value === undefined || value === "") {
    if (context.required) {
      return {
        ok: false,
        errors: [
          issue("MISSING_LEGACY_AMOUNT", `${context.legacyField} is required for dual-write.`, {
            field: context.legacyField,
            value
          })
        ],
        warnings: []
      };
    }
    return { ok: true, skipped: true, warnings: [], errors: [] };
  }

  const warnings = [];
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        warnings,
        errors: [
          issue("INVALID_LEGACY_NUMBER", `${context.legacyField} is not finite.`, {
            field: context.legacyField,
            value
          })
        ]
      };
    }
    warnings.push(
      issue(
        "LEGACY_NUMBER_SOURCE",
        `${context.legacyField} came from a legacy number; do not treat it as future authority.`,
        { field: context.legacyField, value }
      )
    );
  }

  try {
    const fils = parseAedToFils(String(value).trim(), {
      allowNegative: context.allowNegative
    });
    return {
      ok: true,
      skipped: false,
      fils,
      sqlInteger: toSafeSqlInteger(fils),
      aed: filsToAedString(fils),
      warnings,
      errors: []
    };
  } catch (error) {
    return {
      ok: false,
      warnings,
      errors: [
        issue("INVALID_LEGACY_AMOUNT", error?.message || String(error), {
          field: context.legacyField,
          value
        })
      ]
    };
  }
}

export function legacyAmountToFilsDraft(value, context = {}) {
  const spec = normalizeMoneyFieldSpec({
    legacyField: context.legacyField || context.field || "amount",
    filsField: context.filsField || `${context.legacyField || context.field || "amount"}_fils`,
    required: context.required,
    allowNegative: context.allowNegative
  });
  return normalizeLegacyInput(value, spec);
}

function compareExistingFils(record, spec, parsed) {
  if (!record || !(spec.filsField in record) || record[spec.filsField] === null) return null;
  const existing = record[spec.filsField];
  if (!Number.isSafeInteger(existing)) {
    return {
      field: spec.filsField,
      matches: false,
      legacyFils: parsed.fils,
      legacyAed: parsed.aed,
      existingFils: existing,
      existingAed: null,
      deltaFils: null,
      warning: issue("INVALID_EXISTING_FILS", `${spec.filsField} is not a safe integer.`, {
        field: spec.filsField,
        value: existing
      })
    };
  }
  const existingFils = BigInt(existing);
  const delta = parsed.fils - existingFils;
  return {
    field: spec.filsField,
    matches: delta === 0n,
    legacyFils: parsed.fils,
    legacyAed: parsed.aed,
    existingFils,
    existingAed: filsToAedString(existingFils),
    deltaFils: delta,
    deltaAed: filsToAedString(delta)
  };
}

export function createMoneyDualWriteDraft(record, fieldSpecs, options = {}) {
  const source = assertObject(record, "record");
  if (!Array.isArray(fieldSpecs) || fieldSpecs.length === 0) {
    throw new Error("At least one money field spec is required.");
  }

  const patch = {};
  const comparisons = [];
  const warnings = [];
  const errors = [];
  const specs = fieldSpecs.map(normalizeMoneyFieldSpec);

  for (const spec of specs) {
    const parsed = normalizeLegacyInput(source[spec.legacyField], spec);
    warnings.push(...parsed.warnings);
    errors.push(...parsed.errors);
    if (!parsed.ok || parsed.skipped) continue;

    patch[spec.filsField] = parsed.sqlInteger;
    const comparison = compareExistingFils(source, spec, parsed);
    if (comparison) {
      comparisons.push(comparison);
      if (comparison.warning) warnings.push(comparison.warning);
      else if (!comparison.matches) {
        warnings.push(
          issue("LEGACY_FILS_MISMATCH", `${spec.legacyField} differs from ${spec.filsField}.`, {
            legacyField: spec.legacyField,
            filsField: spec.filsField,
            deltaAed: comparison.deltaAed
          })
        );
      }
    }
  }

  const validation = validateDualWritePatch(patch, {
    allowedFields: specs.map((spec) => spec.filsField),
    allowEmpty: Boolean(options.allowEmpty)
  });
  warnings.push(...validation.warnings);
  errors.push(...validation.errors);

  return {
    ok: errors.length === 0,
    sourceRecord: { ...source },
    patch,
    comparisons,
    warnings,
    errors,
    metadata: {
      mode: "dual_write_preparation",
      writesDatabase: false,
      legacyFields: specs.map((spec) => spec.legacyField),
      filsFields: specs.map((spec) => spec.filsField)
    }
  };
}

export function buildDualWritePatch(record, fieldSpecs, options = {}) {
  return createMoneyDualWriteDraft(record, fieldSpecs, options).patch;
}

export function compareLegacyDecimalToFils(record, fieldSpecs) {
  return createMoneyDualWriteDraft(record, fieldSpecs, { allowEmpty: true }).comparisons;
}

export function validateDualWritePatch(patch, options = {}) {
  const target = assertObject(patch, "patch");
  const allowedFields = new Set(options.allowedFields || []);
  const warnings = [];
  const errors = [];
  const entries = Object.entries(target);

  if (!entries.length && !options.allowEmpty) {
    errors.push(issue("EMPTY_DUAL_WRITE_PATCH", "Dual-write patch cannot be empty."));
  }

  for (const [field, value] of entries) {
    try {
      normalizeFieldName(field, "patch field");
    } catch (error) {
      errors.push(issue("UNSAFE_PATCH_FIELD", error.message, { field }));
      continue;
    }
    if (!field.endsWith("_fils")) {
      errors.push(
        issue("NON_FILS_PATCH_FIELD", "Patch fields must target *_fils columns.", { field })
      );
    }
    if (allowedFields.size > 0 && !allowedFields.has(field)) {
      errors.push(
        issue("UNEXPECTED_PATCH_FIELD", "Patch field is not in the allowed spec.", { field })
      );
    }
    if (!Number.isSafeInteger(value)) {
      errors.push(
        issue("INVALID_PATCH_VALUE", "Patch value must be a safe integer.", { field, value })
      );
    }
  }

  return { ok: errors.length === 0, warnings, errors };
}
