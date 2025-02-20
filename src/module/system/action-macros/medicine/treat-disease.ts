import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function treatDisease(options: SkillActionOptions): void {
    const slug = options?.skill ?? "medicine";
    const rollOptions = ["action:treat-disease"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.TreatDisease.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["downtime", "manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatDisease", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatDisease", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatDisease", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
