export const employeeNextScaffoldId = "employee-next-scaffold";

const root = document.querySelector<HTMLElement>("#employee-next-root");

if (root) {
  root.dataset.scaffold = employeeNextScaffoldId;
}
