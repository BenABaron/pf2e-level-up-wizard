import { module_name } from './main.js';
import { FeatSelector } from './featSelector.js';

// @Helpers
import { normalizeString } from './helpers/utility.js';
import { getFeatsForLevel } from './helpers/featsHelpers.js';
import {
  detectPartialBoosts,
  getFeaturesForLevel
} from './helpers/classFeaturesHelpers.js';
import {
  attachAttributeBoostHandlers,
  attachValidationHandlers
} from './helpers/formHelpers.js';
import {
  getSkillsForLevel,
  skillProficiencyRanks
} from './helpers/skillsHelpers.js';
import {
  confirmChanges,
  createGlobalLevelMessage,
  createPersonalLevelMessage,
  getClassJournal
} from './helpers/foundryHelpers.js';

export class PF2eLevelUpWizardConfig extends FormApplication {
  constructor(actorData, triggeredByManualLevelUp = false) {
    super();
    this.actorData = actorData;
    this.triggeredByManualLevelUp = triggeredByManualLevelUp;
    this.featsData = {};
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      height: 'auto',
      width: 525,
      resizable: true,
      id: 'level-up-wizard',
      template: './modules/pf2e-level-up-wizard/templates/level-up-wizard.hbs',
      title: game.i18n.localize('PF2E_LEVEL_UP_WIZARD.menu.title'),
      closeOnSubmit: false
    });
  }

  render(force = false, options = {}) {
    super.render(force, options);

    Hooks.once('renderPF2eLevelUpWizardConfig', (_app, html, data) => {
      const form = this.element.find('form');
      const submitButton = this.element.find('button[type="submit"]');
      const attributeButtons = form.find('.attribute-boosts-button');
      const partialBoosts = detectPartialBoosts(this.actorData);
      const selectedBoosts = new Set();

      const requiredFeats = [];
      html.find('.feat-selector').each((_, container) => {
        const id = $(container).data('id');
        if (id) {
          requiredFeats.push(id);
          new FeatSelector(container, data[id]);
        }

        container.addEventListener('featSelected', (event) => {
          this.featsData[id] = event.detail.selectedFeat.uuid;
        });
      });

      const validateForm = attachValidationHandlers(
        form,
        submitButton,
        attributeButtons,
        selectedBoosts,
        requiredFeats
      );
      attachAttributeBoostHandlers(
        attributeButtons,
        selectedBoosts,
        validateForm,
        partialBoosts
      );
    });
  }

  close(options) {
    const form = this.element.find('form');
    form.off('change', '[data-required="true"]');
    return super.close(options);
  }

  async getData() {
    const actorName = this.actorData.name;
    const currentLevel = this.actorData.system.details.level.value;
    const targetLevel = this.triggeredByManualLevelUp
      ? currentLevel
      : currentLevel + 1;

    const freeArchetype = game.settings.get('pf2e', 'freeArchetypeVariant');
    const ancestryParagon =
      game.modules.get('xdy-pf2e-workbench')?.active &&
      game.settings.get(
        'xdy-pf2e-workbench',
        'legacyVariantRuleAncestryParagon'
      );
    const showFeatPrerequisites = game.settings.get(
      module_name,
      'show-feat-prerequisites'
    );

    const classNames = this.actorData.class?.name
      .split('-')
      .map((cls) => cls.trim());

    let primaryClass = classNames[0];
    let secondaryClass = classNames[1] || null;

    const classFeats = await getFeatsForLevel(
      this.actorData,
      'class',
      targetLevel,
      primaryClass
    );
    let dualClassFeats = [];
    if (secondaryClass) {
      dualClassFeats = await getFeatsForLevel(
        this.actorData,
        'class',
        targetLevel,
        secondaryClass
      );
    }
    const ancestryFeats = await getFeatsForLevel(
      this.actorData,
      'ancestry',
      targetLevel
    );
    const skillFeats = await getFeatsForLevel(
      this.actorData,
      'skill',
      targetLevel
    );
    const generalFeats = await getFeatsForLevel(
      this.actorData,
      'general',
      targetLevel
    );
    const freeArchetypeFeats =
      freeArchetype &&
      (await getFeatsForLevel(this.actorData, 'archetype', targetLevel));
    const ancestryParagonFeats =
      ancestryParagon &&
      (await getFeatsForLevel(this.actorData, 'ancestryParagon', targetLevel));

    const abilities = detectPartialBoosts(this.actorData);
    const features = await getFeaturesForLevel(this.actorData, targetLevel);
    const skills = getSkillsForLevel(this.actorData, targetLevel);
    const classJournals = await getClassJournal(this.actorData);

    const hasFeaturesToDisplay = !!(
      features.featuresForLevel.length > 0 ||
      features.newSpellRankLevel ||
      features.spellcasting
    );

    return {
      primaryClass,
      classFeats,
      secondaryClass,
      dualClassFeats,
      freeArchetypeFeats,
      ancestryFeats,
      ancestryParagonFeats,
      skillFeats,
      generalFeats,
      features,
      abilities,
      skills,
      hasFeaturesToDisplay,
      actorName,
      targetLevel,
      showFeatPrerequisites,
      classJournals
    };
  }

  async _updateObject(event, formData) {
    const finalData = { ...formData, ...this.featsData };
    const confirmed = await confirmChanges();

    if (!confirmed) return;

    const actor = this.actorData;
    const currentLevel = actor.system.details.level.value;
    const targetLevel = this.triggeredByManualLevelUp
      ? currentLevel
      : currentLevel + 1;
    const playerId = game.user.id;
    const actorName = actor.name;

    const data = await this.getData();

    finalData.abilityScoreIncreaseLevel =
      data.features.abilityScoreIncreaseLevel;
    finalData.spellcasting = data.features.spellcasting;
    finalData.newSpellRankLevel = data.features.newSpellRankLevel;

    if (!this.triggeredByManualLevelUp) {
      ui.notifications.info(
        game.i18n.format('PF2E_LEVEL_UP_WIZARD.notifications.levelUpStart', {
          actorName,
          targetLevel
        })
      );

      await actor.update({ 'system.details.level.value': targetLevel });

      await Hooks.once('updateActor', () => {});
    }

    const featEntries = Object.entries({
      classFeats: finalData.classFeats,
      dualClassFeats: finalData.dualClassFeats,
      ancestryFeats: finalData.ancestryFeats,
      skillFeats: finalData.skillFeats,
      generalFeats: finalData.generalFeats,
      freeArchetypeFeats: finalData.freeArchetypeFeats,
      ancestryParagonFeats: finalData.ancestryParagonFeats
    });

    const validFeatEntries = featEntries.filter(([, uuid]) => uuid);

    const featPromises = validFeatEntries.map(async ([type, uuid]) => {
      const feat = await fromUuid(uuid).catch(() => null);
      return { feat, type };
    });

    const featsToAdd = (await Promise.all(featPromises)).filter(
      ({ feat }) => feat
    );

    const featGroupMap = {
      classFeats: 'class',
      dualClassFeats: 'xdy_dualclass',
      ancestryFeats: 'ancestry',
      skillFeats: 'skill',
      generalFeats: 'general',
      freeArchetypeFeats: 'archetype',
      ancestryParagonFeats: 'xdy_ancestryparagon'
    };

    const itemsToCreate = featsToAdd.map(({ feat, type }) => ({
      ...feat.toObject(),
      system: {
        ...feat.system,
        location: `${featGroupMap[type]}-${targetLevel}`,
        level: { ...feat.system.level, taken: targetLevel }
      }
    }));

    await actor.createEmbeddedDocuments('Item', itemsToCreate);

    let skillIncreaseMessage = '';
    if (finalData.skills) {
      const skill = finalData.skills;
      const normalizedSkill = normalizeString(skill);
      const skillRankPath = `system.skills.${normalizedSkill}.rank`;
      const updatedRank = actor.system.skills[normalizedSkill].rank + 1;
      await actor.update({ [skillRankPath]: updatedRank });

      const rankName =
        skillProficiencyRanks[updatedRank] ||
        game.i18n.format(
          'PF2E_LEVEL_UP_WIZARD.messages.skillIncrease.rankName',
          {
            updatedRank
          }
        );

      skillIncreaseMessage = game.i18n.format(
        'PF2E_LEVEL_UP_WIZARD.messages.skillIncrease.rankIncrease',
        { skill, rankName }
      );
    }

    const selectedFeats = featsToAdd
      .map(({ feat }) => `@UUID[${feat.uuid}]`)
      .join(', ');

    if (finalData.abilityScoreIncreaseLevel) {
      const attributeBoosts = this.element.find(
        '.attribute-boosts-button.selected'
      );
      finalData.abilityBoosts = Array.from(attributeBoosts).map((button) =>
        $(button).data('value')
      );

      if (finalData.abilityBoosts.length !== 4) {
        ui.notifications.error(game.i18n.localize('invalid boost selection'));
        return;
      }

      const boostPath = `system.build.attributes.boosts.${targetLevel}`;
      const updateData = { [boostPath]: finalData.abilityBoosts };

      await actor.update(updateData);
    }

    createGlobalLevelMessage(
      actorName,
      targetLevel,
      selectedFeats,
      skillIncreaseMessage
    );

    createPersonalLevelMessage(finalData, playerId, actorName);

    ui.notifications.info(
      game.i18n.format('PF2E_LEVEL_UP_WIZARD.notifications.levelUpComplete', {
        actorName
      })
    );

    this.close();
  }
}
