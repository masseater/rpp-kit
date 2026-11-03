import { createFileRoute } from "@tanstack/react-router";

import { DemoPage } from "#/pages/demo";

const Route = createFileRoute("/")({ component: DemoPage });

export { Route };
