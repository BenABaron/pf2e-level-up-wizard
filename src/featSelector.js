import { createFeatChatMessage } from './helpers/foundryHelpers.js';
import { getAssociatedSkills, SKILLS } from './helpers/skillsHelpers.js';
import { capitalize } from './helpers/utility.js';
import { module_name } from './main.js';

export class FeatSelector {
  constructor(container, feats) {
    this.container = container;
    this.allFeats = feats;
    this.filteredFeats = [...feats];

    const defaultSort = game.settings.get(module_name, 'feat-sort-method');
    const [sortMethod, sortOrder] = defaultSort.toLowerCase().split('_');

    this.filters = {
      minLevel: null,
      maxLevel: null,
      search: '',
      sortMethod: sortMethod,
      sortOrder: sortOrder,
      skills: [],
      includeArchetypeFeats: false,
      dedicationSearch: ''
    };

    this.init();
  }

  init() {
    this.updateFilteredFeats();

    this.attachEventListeners();

    const skillFilter = $(this.container).find('#skill-filter');
    skillFilter.empty();

    SKILLS.forEach((skill) => {
      const localizedSkill = game.i18n.localize(
        `PF2E.Skill.${capitalize(skill)}`
      );
      skillFilter.append(`
        <div class="skill-option">
          <input type="checkbox" id="skill-${skill}" value="${skill}" />
          <label for="skill-${skill}">${localizedSkill}</label>
        </div>
      `);
    });
  }

  render() {
    const listContainer = $(this.container).find('.feat-list');
    listContainer.empty();

    const sortDropdown = $(this.container).find('#sort-options');
    sortDropdown.val(this.filters.sortMethod);

    const templatePath = `modules/${module_name}/templates/partials/feat-option.hbs`;

    const showPrerequisites = game.settings.get(
      module_name,
      'show-feat-prerequisites'
    );

    this.filteredFeats.forEach(async (feat) => {
      if (showPrerequisites && feat.system.prerequisites?.value?.length) {
        feat.displayName = `${feat.name}*`;
      } else {
        feat.displayName = feat.name;
      }

      const html = await renderTemplate(templatePath, feat);
      listContainer.append(html);
    });

    if (this.container.dataset.id === 'freeArchetypeFeats') {
      $(this.container).find('#search-dedications').removeClass('hidden');
    }
  }

  selectFeat(uuid) {
    const selectedFeat = this.allFeats.find((feat) => feat.uuid === uuid);

    const toggleButton = this.container.querySelector('.feat-selector-toggle');

    toggleButton.textContent = game.i18n.format(
      'PF2E_LEVEL_UP_WIZARD.menu.featButtonContent',
      { name: selectedFeat.name, level: selectedFeat.system.level.value }
    );

    const menu = this.container.querySelector('.feat-selector-menu');
    menu.classList.add('hidden');

    const event = new CustomEvent('featSelected', {
      detail: { id: this.container.dataset.id, selectedFeat }
    });
    this.container.dispatchEvent(event);
  }

  attachEventListeners() {
    const toggleButton = $(this.container).find('.feat-selector-toggle');
    const menu = $(this.container).find('.feat-selector-menu');

    // Toggle menu visibility
    toggleButton.on('click', () => {
      menu.toggleClass('hidden');
    });

    // Event: Close Menu
    $(this.container)
      .find('.feat-header-button')
      .on('click', () => menu.toggleClass('hidden'));

    // Event: Min Level
    $(this.container)
      .find('#min-level')
      .on('input', (e) => {
        this.filters.minLevel = parseInt(e.target.value, 10) || null;
        this.updateFilteredFeats();
      });

    // Event: Max Level
    $(this.container)
      .find('#max-level')
      .on('input', (e) => {
        this.filters.maxLevel = parseInt(e.target.value, 10) || null;
        this.updateFilteredFeats();
      });

    // Event: Search
    $(this.container)
      .find('#search-feats')
      .on('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.updateFilteredFeats();
      });

    // Event: Sort
    $(this.container)
      .find('#sort-options')
      .on('change', (e) => {
        this.filters.sortMethod = e.target.value;
        this.updateFilteredFeats();
      });

    // Event: Sort
    $(this.container)
      .find('#order-button')
      .on('click', () => {
        if (this.filters.sortOrder === 'desc') {
          this.filters.sortOrder = 'asc';
        } else {
          this.filters.sortOrder = 'desc';
        }
        this.updateFilteredFeats();
      });

    const skillFilter = $(this.container).find('#skill-filter');
    // Event: Skill Dropdown
    $(this.container)
      .find('.skill-filter-label')
      .on('click', () => {
        skillFilter.toggleClass('hidden');

        const skillLabelIcon = $(this.container)
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
    const archetypeCheckbox = $(this.container).find('#show-archetype-feats');
    if (archetypeCheckbox.length) {
      archetypeCheckbox.on('change', (e) => {
        const isChecked = e.target.checked;
        this.filters.includeArchetypeFeats = isChecked;
        this.updateFilteredFeats();
        const dedicationSearch = $(this.container).find('#search-dedications');

        if (isChecked) {
          dedicationSearch.removeClass('hidden');
        } else {
          dedicationSearch.addClass('hidden');
        }
      });
    }

    // Event: Dedication Search
    $(this.container)
      .find('#search-dedications')
      .on('input', (e) => {
        this.filters.dedicationSearch = e.target.value.toLowerCase();
        this.updateFilteredFeats();
      });

    // Event: Select Feat
    $(this.container)
      .find('.feat-list')
      .on('click', (e) => {
        if (
          $(e.target).hasClass('feat-link') ||
          $(e.target).closest('[data-action="send-to-chat"]').length
        ) {
          return;
        }

        const target = e.target.closest('.feat-option');
        if (target) {
          this.selectFeat(target.dataset.uuid);
        }
      });

    // Event: Send Feat to Chat
    $(this.container)
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

  updateFilteredFeats() {
    const includeArchetypeFeats =
      this.container.dataset.id === 'freeArchetypeFeats' ||
      this.filters.includeArchetypeFeats;
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

      const associatedSkills = getAssociatedSkills(feat.system.prerequisites);
      const matchesSkills =
        this.filters.skills.length === 0 || // No skill filter applied
        this.filters.skills.some((skill) => associatedSkills.includes(skill));

      const matchesArchetype =
        includeArchetypeFeats ||
        !feat.system.traits.value.includes('archetype');

      const matchesDedicationSearch =
        !this.filters.dedicationSearch ||
        feat.system.prerequisites?.value?.some((prereq) => {
          const prerequisiteValue = prereq.value.toLowerCase();
          return (
            prerequisiteValue.includes(this.filters.dedicationSearch) &&
            prerequisiteValue.includes('dedication')
          );
        });

      return (
        matchesMinLevel &&
        matchesMaxLevel &&
        matchesSearch &&
        matchesSkills &&
        matchesArchetype &&
        matchesDedicationSearch
      );
    });

    this.sortFeats();
    this.render();
  }

  sortFeats() {
    const button = $(this.container).find('#order-button').children('i');

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
}
