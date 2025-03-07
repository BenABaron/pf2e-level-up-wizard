import { createFeatChatMessage } from './helpers/foundryHelpers.js';
import {
  getAssociatedSkills,
  getSkillTranslation,
  SKILLS
} from './helpers/skillsHelpers.js';

export class FeatSelector extends foundry.applications.api.ApplicationV2 {
  constructor(feats, featType, actorName, targetLevel, options) {
    super(options);
    this.featType = featType;
    this.actorName = actorName;
    this.targetLevel = targetLevel;
    this.allFeats = feats;
    this.filteredFeats = [...feats];

    const defaultSort = game.settings.get(
      'pf2e-level-up-wizard',
      'feat-sort-method'
    );
    const [sortMethod, sortOrder] = defaultSort.toLowerCase().split('_');

    this.filters = {
      minLevel: null,
      maxLevel: null,
      search: '',
      sortMethod: sortMethod,
      sortOrder: sortOrder,
      skills: [],
      includeArchetypeFeats: false,
      hideSkillFeats: false,
      dedicationSearch: ''
    };
  }

  static DEFAULT_OPTIONS = {
    id: 'feat-selector',
    classes: ['feat-selector'],
    position: {
      width: 600,
      height: 500
    }
  };

  static PARTS = {
    featSelector: {
      template: `modules/pf2e-level-up-wizard/templates/feat-selector.hbs`
    }
  };

  get title() {
    const featTypeMapping = {
      classFeats: 'Class Feats',
      dualClassFeats: 'Class Feats',
      freeArchetypeFeats: 'Free Archetype Feats',
      skillFeats: 'Skill Feats',
      generalFeats: 'General Feats',
      ancestryFeats: 'Ancestry Feats',
      ancestryParagonFeats: 'Ancestry Paragon Feats'
    };

    const featTypeName = featTypeMapping[this.featType] || 'Feats';

    return `${this.actorName} ${featTypeName} | Level ${this.targetLevel}`;
  }

  _prepareContext() {
    const showPrerequisites = game.settings.get(
      'pf2e-level-up-wizard',
      'show-feat-prerequisites'
    );
    const localizedSkills = SKILLS.map((skill) => ({
      key: skill,
      label: getSkillTranslation(skill)
    }));

    this.filteredFeats.forEach((feat) => {
      if (showPrerequisites && feat.system.prerequisites?.value?.length) {
        feat.displayName = `${feat.name}*`;
      } else {
        feat.displayName = feat.name;
      }
    });

    return {
      feats: this.filteredFeats,
      filters: this.filters,
      skills: localizedSkills,
      featType: this.featType
    };
  }

  _onRender() {
    const dedicationSearch = $(this.element).find('#search-dedications');
    if (this.featType === 'freeArchetypeFeats') {
      $(dedicationSearch).removeClass('hidden');
    }

    this.updateFilteredFeats();
  }

  async _renderHTML(context) {
    return renderTemplate(
      `modules/pf2e-level-up-wizard/templates/feat-selector.hbs`,
      context
    );
  }

  _replaceHTML(element, html) {
    const div = document.createElement('div');
    div.innerHTML = element;
    html.replaceChildren(div);
    this.activateListeners(html);
  }

  activateListeners(html) {
    // Event: Min Level
    $(html)
      .find('#min-level')
      .on('input', (e) => {
        this.filters.minLevel = parseInt(e.target.value, 10) || null;
        this.updateFilteredFeats();
      });

    // Event: Max Level
    $(html)
      .find('#max-level')
      .on('input', (e) => {
        this.filters.maxLevel = parseInt(e.target.value, 10) || null;
        this.updateFilteredFeats();
      });

    // Event: Search
    $(html)
      .find('#search-feats')
      .on('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.updateFilteredFeats();
      });

    // Event: Sort
    $(html)
      .find('#sort-options')
      .on('change', (e) => {
        this.filters.sortMethod = e.target.value;
        this.updateFilteredFeats();
      });

    // Event: Sort
    $(html)
      .find('#order-button')
      .on('click', () => {
        if (this.filters.sortOrder === 'desc') {
          this.filters.sortOrder = 'asc';
        } else {
          this.filters.sortOrder = 'desc';
        }
        this.updateFilteredFeats();
      });

    // Event: Skill Dropdown
    const skillFilter = $(html).find('#skill-filter');
    $(html)
      .find('.skill-filter-label')
      .on('click', () => {
        skillFilter.toggleClass('hidden');

        const skillLabelIcon = $(html)
          .find('.skill-filter-label')
          .children('i');
        skillLabelIcon
          .removeClass()
          .addClass(
            skillFilter.hasClass('hidden')
              ? 'fa-solid fa-chevron-down'
              : 'fa-solid fa-chevron-up'
          );
      });

    // Event: Select Skill
    skillFilter.on('change', 'input[type="checkbox"]', (e) => {
      const skill = e.target.value;

      if (e.target.checked) {
        this.filters.skills.push(skill);
      } else {
        this.filters.skills = this.filters.skills.filter((s) => s !== skill);
      }

      this.updateFilteredFeats();
    });

    // Event: Include Archetype Feats
    const archetypeCheckbox = $(html).find('#show-archetype-feats');
    const dedicationSearch = $(html).find('#search-dedications');

    if (archetypeCheckbox.length) {
      archetypeCheckbox.on('change', (e) => {
        const isChecked = e.target.checked;
        this.filters.includeArchetypeFeats = isChecked;

        if (isChecked) {
          dedicationSearch.removeClass('hidden');
        } else {
          dedicationSearch.addClass('hidden');
          this.filters.dedicationSearch = '';
          dedicationSearch.val('');
        }

        this.updateFilteredFeats();
      });
    }

    // Event: Dedication Search
    $(html)
      .find('#search-dedications')
      .on('input', (e) => {
        this.filters.dedicationSearch = e.target.value.toLowerCase();
        this.updateFilteredFeats();
      });

    // Event: Hide Skill Feats
    const hideSkillFeatsCheckbox = $(html).find('#hide-skill-feats');
    const skillFilterContainer = $(html).find('.skill-filter-container');

    if (hideSkillFeatsCheckbox.length) {
      hideSkillFeatsCheckbox.on('change', (e) => {
        const isChecked = e.target.checked;
        this.filters.hideSkillFeats = isChecked;

        if (isChecked) {
          skillFilterContainer.addClass('hidden');
          this.filters.skills = [];
          skillFilter.find('input[type="checkbox"]').prop('checked', false);
        } else {
          skillFilterContainer.removeClass('hidden');
        }

        this.updateFilteredFeats();
      });
    }

    // Event: Select Feat
    $(html)
      .find('.feat-list')
      .on('click', '[class="confirm-feat-button"]', (e) => {
        const target = e.target.closest('.feat-option');
        if (target) {
          this.selectFeat(target.dataset.uuid);
        }
      });

    // Event: Send Feat to Chat
    $(html)
      .find('.feat-list')
      .on('click', '[data-action="send-to-chat"]', async (e) => {
        const container = $(e.currentTarget).closest('.feat-option');
        const uuid = container.data('uuid');
        if (uuid) {
          const feat = await fromUuid(uuid);
          if (feat) {
            createFeatChatMessage(feat);
          }
        }
      });
  }

  selectFeat(uuid) {
    const selectedFeat = this.allFeats.find((feat) => feat.uuid === uuid);

    if (!selectedFeat) {
      console.error(`Feat with UUID ${uuid} not found.`);
      return;
    }

    const event = new CustomEvent('featSelected', {
      detail: { featType: this.featType, selectedFeat }
    });
    window.dispatchEvent(event);

    this.close();
  }

  updateFilteredFeats() {
    const includeArchetypeFeats =
      this.featType === 'freeArchetypeFeats' ||
      this.filters.includeArchetypeFeats;

    const hideSkillFeats =
      this.featType === 'generalFeats' && this.filters.hideSkillFeats;

    const hideUncommonFeats = game.settings.get(
      'pf2e-level-up-wizard',
      'hide-uncommon-feats'
    );

    this.filteredFeats = this.allFeats.filter((feat) => {
      const matchesMinLevel =
        this.filters.minLevel === null ||
        feat.system.level.value >= this.filters.minLevel;

      const matchesMaxLevel =
        this.filters.maxLevel === null ||
        feat.system.level.value <= this.filters.maxLevel;

      const matchesSearch = feat.name
        .toLowerCase()
        .includes(this.filters.search);

      const matchesHideSkillFeats =
        !hideSkillFeats || !feat.system.traits.value.includes('skill');

      const associatedSkills = getAssociatedSkills(feat.system.prerequisites);
      const matchesSkills =
        this.filters.skills.length === 0 ||
        this.filters.skills.some((skill) => associatedSkills.includes(skill));

      const isArchetypeFeat =
        feat.system.traits.value.includes('archetype') || feat.isArchetypeFeat;

      const matchesArchetype = includeArchetypeFeats || !isArchetypeFeat;

      const dedicationTranslated = game.i18n
        .localize('PF2E.TraitDedication')
        .toLowerCase();
      const matchesDedicationSearch =
        !this.filters.dedicationSearch ||
        feat.system.prerequisites?.value?.some((prereq) => {
          const prerequisiteValue = prereq.value.toLowerCase();
          return (
            prerequisiteValue.includes(this.filters.dedicationSearch) &&
            (prerequisiteValue.includes('dedication') ||
              prerequisiteValue.includes(dedicationTranslated))
          );
        });

      const matchesHideUncommonFeats =
        !hideUncommonFeats || feat.system.traits.rarity === 'common';

      return (
        matchesMinLevel &&
        matchesMaxLevel &&
        matchesSearch &&
        matchesHideSkillFeats &&
        matchesSkills &&
        matchesArchetype &&
        matchesDedicationSearch &&
        matchesHideUncommonFeats
      );
    });

    this.sortFeats();
    this.updateFeatList();
  }

  sortFeats() {
    const button = $(this.element).find('#order-button').children('i');

    const iconMapping = {
      'alpha-asc': 'fa-solid fa-sort-alpha-up',
      'alpha-desc': 'fa-solid fa-sort-alpha-down-alt',
      'level-asc': 'fa-solid fa-sort-numeric-up',
      'level-desc': 'fa-solid fa-sort-numeric-down-alt'
    };

    const sortMethod = `${this.filters.sortMethod}-${this.filters.sortOrder}`;

    button.removeClass().addClass(iconMapping[sortMethod] || '');

    this.filteredFeats.sort((a, b) => {
      if (sortMethod === 'level-desc')
        return b.system.level.value - a.system.level.value;
      if (sortMethod === 'level-asc')
        return a.system.level.value - b.system.level.value;
      if (sortMethod === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortMethod === 'alpha-desc') return b.name.localeCompare(a.name);
    });
  }

  async updateFeatList() {
    const listContainer = this.element.querySelector('.feat-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const templatePath = `modules/pf2e-level-up-wizard/templates/partials/feat-option.hbs`;

    for (const feat of this.filteredFeats) {
      const html = await renderTemplate(templatePath, feat);
      listContainer.insertAdjacentHTML('beforeend', html);
    }
  }
}
