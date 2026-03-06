import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";

interface Options extends RenderOptions {
  routerProps?: MemoryRouterProps;
}

export function renderWithRouter(ui: ReactElement, options: Options = {}) {
  const { routerProps, ...renderOptions } = options;
  return render(<MemoryRouter {...routerProps}>{ui}</MemoryRouter>, renderOptions);
}
