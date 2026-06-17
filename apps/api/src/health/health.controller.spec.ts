import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe("GET /healthz", () => {
    it("returns status ok", () => {
      expect(controller.liveness()).toEqual({ status: "ok" });
    });
  });

  describe("GET /readyz", () => {
    it("returns status ok", () => {
      expect(controller.readiness()).toEqual({ status: "ok" });
    });
  });

  describe("GET /version", () => {
    it("returns 0.0.0 when npm_package_version is not set", () => {
      delete process.env.npm_package_version;
      expect(controller.version()).toEqual({ version: "0.0.0" });
    });

    it("returns the version from npm_package_version env var", () => {
      process.env.npm_package_version = "1.2.3";
      expect(controller.version()).toEqual({ version: "1.2.3" });
      delete process.env.npm_package_version;
    });
  });
});
