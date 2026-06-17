import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("healthz")
  liveness(): { status: string } {
    return { status: "ok" };
  }

  @Get("readyz")
  readiness(): { status: string } {
    return { status: "ok" };
  }

  @Get("version")
  version(): { version: string } {
    return { version: process.env.npm_package_version ?? "0.0.0" };
  }
}
