import {
    ActionGlyph,
    CheckContext,
    CheckContextData,
    CheckContextOptions,
    CheckResultCallback,
} from "@system/action-macros/types.ts";
import { ActionUseOptions } from "./types.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ActionMacroHelpers } from "@system/action-macros/index.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { Statistic } from "@system/statistic/index.ts";
import { RollNotePF2e, RollNoteSource } from "@module/notes.ts";
import { BaseAction, BaseActionData, BaseActionVariant, BaseActionVariantData } from "./base.ts";
import { getActionGlyph } from "@util";
import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";

type SingleCheckActionRollNoteData = Omit<RollNoteSource, "selector"> & { selector?: string };
function toRollNoteSource(data: SingleCheckActionRollNoteData): RollNoteSource {
    data.selector ??= "";
    return data as RollNoteSource;
}

interface SingleCheckActionVariantData extends BaseActionVariantData {
    difficultyClass?: CheckDC | string;
    notes?: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic?: string;
}

interface SingleCheckActionData extends BaseActionData<SingleCheckActionVariantData> {
    difficultyClass?: CheckDC | string;
    notes?: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic: string;
}

interface SingleCheckActionUseOptions extends ActionUseOptions {
    actors: ActorPF2e | ActorPF2e[];
    difficultyClass: CheckDC | string;
    modifiers: ModifierPF2e[];
    multipleAttackPenalty: number;
    notes: SingleCheckActionRollNoteData[];
    rollOptions?: string[];
    statistic: string;
}

function isCheckDC(dc?: CheckDC | string | null): dc is CheckDC {
    return !!dc && typeof dc !== "string" && "value" in dc;
}

function isString(dc?: CheckDC | string | null): dc is string {
    return !!dc && typeof dc === "string";
}

class SingleCheckActionVariant extends BaseActionVariant {
    readonly #action: SingleCheckAction;
    readonly #difficultyClass?: CheckDC | string;
    readonly #notes?: RollNoteSource[];
    readonly #rollOptions?: string[];
    readonly #statistic?: string;

    constructor(action: SingleCheckAction, data?: SingleCheckActionVariantData) {
        super(action, data);
        this.#action = action;
        if (data) {
            this.#difficultyClass = data.difficultyClass;
            this.#notes = data.notes ? data.notes.map(toRollNoteSource) : undefined;
            this.#rollOptions = data.rollOptions;
            this.#statistic = data.statistic;
        }
    }

    get difficultyClass() {
        return this.#difficultyClass ?? this.#action.difficultyClass;
    }

    get notes() {
        return this.#notes ?? this.#action.notes;
    }

    get rollOptions() {
        return this.#rollOptions ?? this.#action.rollOptions;
    }

    get statistic() {
        return this.#statistic ?? this.#action.statistic;
    }

    override async use(options: Partial<SingleCheckActionUseOptions> = {}) {
        const difficultyClass = options?.difficultyClass ?? this.difficultyClass;
        const modifiers = options?.modifiers ?? [];
        if (options?.multipleAttackPenalty) {
            const map = options.multipleAttackPenalty;
            const modifier = map > 0 ? Math.min(2, map) * -5 : map;
            modifiers.push(new ModifierPF2e({ label: "PF2E.MultipleAttackPenalty", modifier }));
        }
        const notes = (this.notes as SingleCheckActionRollNoteData[])
            .concat(options?.notes ?? [])
            .map(toRollNoteSource)
            .map((note) => new RollNotePF2e(note));
        const rollOptions = this.rollOptions.concat(options?.rollOptions ?? []);
        const slug = this.statistic;
        const title = this.name
            ? `${game.i18n.localize(this.#action.name)} - ${game.i18n.localize(this.name)}`
            : game.i18n.localize(this.#action.name);
        const results: CheckResultCallback[] = [];
        await ActionMacroHelpers.simpleRollActionCheck({
            actors: options?.actors,
            title,
            actionGlyph: getActionGlyph(this.cost ?? null) as ActionGlyph,
            callback: (result) => results.push(result),
            checkContext: (opts) => this.checkContext(opts, { modifiers, rollOptions, slug }),
            difficultyClass: isCheckDC(difficultyClass) ? difficultyClass : undefined,
            difficultyClassStatistic: isString(difficultyClass)
                ? (target) => getProperty(target, difficultyClass) as Statistic
                : undefined,
            event: options?.event,
            extraNotes: (selector) =>
                notes.map((note) => {
                    note.selector ||= selector; // treat empty selectors as always applicable to this check
                    return note;
                }),
            traits: this.traits,
        });
        return results;
    }

    protected checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>
    ): CheckContext<ItemType> | undefined {
        return ActionMacroHelpers.defaultCheckContext(opts, data);
    }
}

class SingleCheckAction extends BaseAction<SingleCheckActionVariantData, SingleCheckActionVariant> {
    readonly difficultyClass?: CheckDC | string;
    readonly notes: RollNoteSource[];
    readonly rollOptions: string[];
    readonly statistic: string;

    public constructor(data: SingleCheckActionData) {
        super(data);
        this.difficultyClass = data.difficultyClass;
        this.notes = (data.notes ?? []).map(toRollNoteSource);
        this.rollOptions = data.rollOptions ?? [];
        this.statistic = data.statistic;
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new SingleCheckActionVariant(this, data);
    }
}

export { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData };
