import { Injectable, OnModuleInit } from "@nestjs/common";
import { ObjectivesService } from "./objectives.service";
import { KeyResultsService } from "./key-results.service";
import { CheckInsService } from "./check-ins.service";

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly objectives: ObjectivesService,
    private readonly keyResults: KeyResultsService,
    private readonly checkIns: CheckInsService,
  ) {}

  onModuleInit(): void {
    this.seed();
  }

  private seed(): void {
    // ── Objective 1 ────────────────────────────────────────────────────────
    const shipVideo = this.objectives.create({
      title: "Ship the Agentic Workflow Template video",
      description:
        "Record, edit, and publish the YouTube walkthrough demonstrating the full agentic workflow loop end-to-end.",
      ownerId: "demo-user",
      cycleId: "2026-Q2",
    });

    const script = this.keyResults.create({
      objectiveId: shipVideo.id,
      title: "Script drafted and reviewed",
      unit: "percent",
      startValue: 0,
      targetValue: 100,
    });
    this.checkIns.create({
      keyResultId: script.id,
      value: 100,
      note: "Script locked — ready to record.",
    });

    const segments = this.keyResults.create({
      objectiveId: shipVideo.id,
      title: "Segments recorded",
      unit: "number",
      startValue: 0,
      targetValue: 8,
    });
    this.checkIns.create({
      keyResultId: segments.id,
      value: 4,
      note: "Setup, pickup, and PR flow done.",
    });
    this.checkIns.create({
      keyResultId: segments.id,
      value: 6,
      note: "Quality gates and verify segments in the can.",
    });

    const edit = this.keyResults.create({
      objectiveId: shipVideo.id,
      title: "Edit complete and exported",
      unit: "percent",
      startValue: 0,
      targetValue: 100,
    });
    this.checkIns.create({
      keyResultId: edit.id,
      value: 35,
      note: "Rough cut through segment 4.",
    });

    // ── Objective 2 ────────────────────────────────────────────────────────
    const masterWorkflows = this.objectives.create({
      title: "Master agentic development with Claude Code",
      description:
        "Become fluent in the full workflow loop: pickup → branch → code → gates → PR → merge, using Claude as the primary development agent.",
      ownerId: "demo-user",
      cycleId: "2026-Q2",
    });

    const commands = this.keyResults.create({
      objectiveId: masterWorkflows.id,
      title: "Core slash commands in daily use",
      unit: "number",
      startValue: 0,
      targetValue: 10,
    });
    this.checkIns.create({
      keyResultId: commands.id,
      value: 4,
      note: "/pickup, /pr, /run, /push working well.",
    });
    this.checkIns.create({
      keyResultId: commands.id,
      value: 8,
      note: "Added /morning, /review-loop, /capture, /sync.",
    });

    const gatePassRate = this.keyResults.create({
      objectiveId: masterWorkflows.id,
      title: "CI quality gate pass rate",
      unit: "percent",
      startValue: 0,
      targetValue: 100,
    });
    this.checkIns.create({
      keyResultId: gatePassRate.id,
      value: 70,
      note: "Lint and typecheck green; tests still flaky.",
    });
    this.checkIns.create({
      keyResultId: gatePassRate.id,
      value: 88,
      note: "Flaky tests fixed, coverage above threshold.",
    });

    const agentConfidence = this.keyResults.create({
      objectiveId: masterWorkflows.id,
      title: "Complex tasks completed without manual intervention",
      unit: "number",
      startValue: 0,
      targetValue: 20,
    });
    this.checkIns.create({
      keyResultId: agentConfidence.id,
      value: 12,
      note: "Styling, bug fixes, and skill authoring all agent-driven.",
    });

    // ── Objective 3 ────────────────────────────────────────────────────────
    const qualityStandards = this.objectives.create({
      title: "Establish engineering quality standards for the template",
      description:
        "Define and enforce the quality gates, ADRs, and testing conventions that make the template production-ready for any team adopting it.",
      ownerId: "demo-user",
      cycleId: "2026-Q2",
    });

    const testCoverage = this.keyResults.create({
      objectiveId: qualityStandards.id,
      title: "Unit test coverage",
      unit: "percent",
      startValue: 0,
      targetValue: 80,
    });
    this.checkIns.create({
      keyResultId: testCoverage.id,
      value: 62,
      note: "API services covered; web components not yet.",
    });
    this.checkIns.create({
      keyResultId: testCoverage.id,
      value: 74,
      note: "Web unit tests added for key pages.",
    });

    const adrs = this.keyResults.create({
      objectiveId: qualityStandards.id,
      title: "Architecture decisions documented as ADRs",
      unit: "number",
      startValue: 0,
      targetValue: 8,
    });
    this.checkIns.create({
      keyResultId: adrs.id,
      value: 3,
      note: "Monorepo structure, API design, and auth strategy ADRs done.",
    });
    this.checkIns.create({
      keyResultId: adrs.id,
      value: 5,
      note: "Added testing strategy and observability ADRs.",
    });

    const onboarding = this.keyResults.create({
      objectiveId: qualityStandards.id,
      title: "New developer onboarding time (minutes)",
      unit: "number",
      startValue: 90,
      targetValue: 15,
    });
    this.checkIns.create({
      keyResultId: onboarding.id,
      value: 60,
      note: "CLAUDE.md and CONTRIBUTING.md drafted.",
    });
    this.checkIns.create({
      keyResultId: onboarding.id,
      value: 30,
      note: "Local setup script and sync command reduce friction.",
    });
  }
}
