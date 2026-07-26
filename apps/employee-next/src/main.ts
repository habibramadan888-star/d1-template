import {
  createEmployeeNextRouteController,
  type EmployeeNextRouteController,
  type EmployeeNextRouteView,
} from "./route";

export const employeeNextRouteId = "employee-next-route-candidate";

function appendText(
  parent: HTMLElement,
  tagName: "h1" | "p" | "section",
  text: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  parent.append(element);
  return element;
}

function createLocalRenderPort(
  root: HTMLElement,
  controllerRef: () => EmployeeNextRouteController | undefined,
) {
  return Object.freeze({
    render(view: EmployeeNextRouteView): void {
      root.replaceChildren();
      root.dataset.route = "/employee-next";
      root.dataset.routeStatus = view.state.status;

      appendText(root, "h1", "Employee Next");
      appendText(root, "p", `Route status: ${view.state.status}`);
      appendText(root, "p", `Authentication: ${view.shell.auth.status}`);
      appendText(root, "p", `Submit status: ${view.shell.submit.status}`);

      const eventSection = appendText(root, "section", "");
      eventSection.setAttribute("aria-label", "Seven event choices");
      for (const option of view.shell.eventOptions) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option.displayName;
        button.dataset.eventId = option.eventId;
        button.setAttribute("aria-pressed", String(option.selected));
        button.addEventListener("click", () => {
          const controller = controllerRef();
          if (controller !== undefined) {
            controller.selectEvent(option.eventId);
            void controller.render();
          }
        });
        eventSection.append(button);
      }
    },
  });
}

function createDisabledLocalTransport() {
  return Object.freeze({
    async request() {
      return Object.freeze({
        status: 503,
        body: Object.freeze({ errorCode: "LOCAL_ROUTE_TRANSPORT_DISABLED" }),
      });
    },
  });
}

export function startEmployeeNextRoute(
  root: HTMLElement,
): EmployeeNextRouteController {
  let controller: EmployeeNextRouteController | undefined;
  controller = createEmployeeNextRouteController({
    transport: createDisabledLocalTransport(),
    render: createLocalRenderPort(root, () => controller),
    buildApiRequest: () => Object.freeze({
      method: "POST",
      path: "/unit-test-route-submit",
    }),
  });
  root.dataset.routeCandidate = employeeNextRouteId;
  void controller.render();
  return controller;
}

if (typeof document !== "undefined") {
  const root = document.querySelector<HTMLElement>("#employee-next-root");
  if (root !== null) {
    startEmployeeNextRoute(root);
  }
}
