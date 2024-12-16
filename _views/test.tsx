import { ViewMap } from "@core/types";

const testView: ViewMap = {
    '/': () => <div>Welcome to Movico!</div>, // Ensure the root path is handled
    '/test': () => <div>This is a test view.</div>,
};

export { testView };