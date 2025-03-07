import { module_name } from '../main.js';
import { capitalize } from './utility.js';
export const skillProficiencyRanks = {
  0: 'Untrained',
  1: 'Trained',
  2: 'Expert',
  3: 'Master',
  4: 'Legendary'
};

const getSkillRankClass = (rank) => {
  switch (rank) {
    case 0:
      return 'skill-option-untrained';
    case 1:
      return 'skill-option-trained';
    case 2:
      return 'skill-option-expert';
    case 3:
      return 'skill-option-master';
    case 4:
      return 'skill-option-legendary';
    default:
      return '';
  }
};

export const SKILLS = [
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery'
];

export const getMaxSkillProficiency = (level) => {
  if (level >= 15) return 4; // Legendary
  if (level >= 7) return 3; // Master
  return 2; // Expert
};

const SKILL_TRANSLATIONS_MAP = {};

export const getSkillTranslation = (skill) => {
  if (!SKILL_TRANSLATIONS_MAP[skill]) {
    SKILL_TRANSLATIONS_MAP[skill] = game.i18n.localize(
      `PF2E.Skill.${capitalize(skill)}`
    );
  }
  return SKILL_TRANSLATIONS_MAP[skill];
};

const getSkillDropdownLabel = (skillName, modifier, nextRank) => {
  const skillIncreaseInfo = game.settings.get(
    module_name,
    'skill-increase-info'
  );

  switch (skillIncreaseInfo) {
    case 'NAME_ONLY':
      return `${skillName}`;
    case 'NAME_WITH_MOD':
      return `${skillName} +${modifier}`;
    case 'NAME_WITH_RANK':
      if (!nextRank) {
        return `${skillName}`;
      }
      return `${skillName} → ${nextRank}`;
    case 'NAME_WITH_MOD_AND_RANK':
      if (!nextRank) {
        return `${skillName} +${modifier}`;
      }
      return `${skillName} +${modifier} → ${nextRank}`;
    default:
      return `${skillName}`;
  }
};

export const getSkillsForLevel = (characterData, targetLevel) => {
  const levelsArray = characterData?.class?.system?.skillIncreaseLevels?.value;

  if (!levelsArray.includes(targetLevel)) return [];

  const maxProficiency = getMaxSkillProficiency(targetLevel);

  return Object.values(characterData?.skills)
    .filter((skill) => skill.rank < maxProficiency)
    .map((skill) => {
      const modifier = characterData?.system?.skills[skill.slug].value;
      const nextRank = skillProficiencyRanks[skill.rank + 1];

      return {
        ...skill,
        class: getSkillRankClass(skill.rank),
        dropdownLabel: getSkillDropdownLabel(skill.label, modifier, nextRank)
      };
    });
};

export const getAssociatedSkills = (prerequisites) => {
  if (!prerequisites || !Array.isArray(prerequisites.value)) {
    return [];
  }

  return prerequisites.value
    .flatMap((prereq) => {
      const matches = SKILLS.filter(
        (skill) =>
          new RegExp(`\\b${skill}\\b`, 'i').test(prereq.value) ||
          new RegExp(`\\b${getSkillTranslation(skill)}\\b`, 'i').test(
            prereq.value
          )
      );
      return matches;
    })
    .filter(Boolean);
};

export const getSkillPotencyForLevel = (
  characterData,
  targetLevel,
  isABPEnabled
) => {
  if (!isABPEnabled) {
    return { hasSkillPotencyUpgrade: false };
  }

  const potencyLevels = [3, 6, 9, 13, 15, 17, 20];
  if (!potencyLevels.includes(targetLevel)) {
    return { hasSkillPotencyUpgrade: false };
  }

  const allSkills = Object.values(characterData?.skills).map((skill) => {
    const modifier = characterData?.system?.skills[skill.slug].value;

    return {
      ...skill,
      class: getSkillRankClass(skill.rank),
      dropdownLabel: getSkillDropdownLabel(skill.label, modifier, null)
    };
  });

  const currentPotencyLevels = [];
  const skillsWithPotency = [];

  allSkills.forEach((skill) => {
    const potencyModifier = skill.modifiers.find(
      (mod) => mod.type === 'potency'
    );
    if (potencyModifier) {
      skillsWithPotency.push(skill);
      currentPotencyLevels.push({
        skill: capitalize(skill.slug),
        potency: potencyModifier.modifier
      });
    }
  });

  const newPotencyLevels = [3, 6, 13, 15, 17, 20];
  const potencyAvailableNewBoosts = newPotencyLevels.includes(targetLevel)
    ? allSkills.filter(
        (skill) =>
          !currentPotencyLevels.some(
            (potentSkill) => potentSkill.skill === capitalize(skill.slug)
          )
      )
    : undefined;

  const upgradeTo2Levels = [9, 13, 15, 17, 20];
  const potencyUpgradeTo2Options = upgradeTo2Levels.includes(targetLevel)
    ? skillsWithPotency.filter((skill) =>
        currentPotencyLevels.some(
          (potentSkill) =>
            potentSkill.potency === 1 &&
            potentSkill.skill === capitalize(skill.slug)
        )
      )
    : undefined;

  const upgradeTo3Levels = [17, 20];
  const potencyUpgradeTo3Options = upgradeTo3Levels.includes(targetLevel)
    ? skillsWithPotency.filter((skill) =>
        currentPotencyLevels.some(
          (potentSkill) =>
            potentSkill.potency === 2 &&
            potentSkill.skill === capitalize(skill.slug)
        )
      )
    : undefined;

  return {
    hasSkillPotencyUpgrade: true,
    potencyAvailableNewBoosts,
    potencyUpgradeTo2Options,
    potencyUpgradeTo3Options,
    currentPotencyLevels
  };
};

export const buildPotencyModifier = (modifier) => {
  return [
    {
      slug: 'potency',
      label: 'Potency',
      domains: [],
      modifier: modifier,
      type: 'potency',
      ability: null,
      adjustments: [],
      force: false,
      enabled: true,
      ignored: false,
      source: null,
      custom: true,
      damageType: null,
      damageCategory: null,
      critical: null,
      tags: [],
      hideIfDisabled: false,
      kind: 'bonus',
      predicate: []
    }
  ];
};
