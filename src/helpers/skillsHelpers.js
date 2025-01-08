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

export const getSkillTranslation= (skill) => {
  if(!SKILL_TRANSLATIONS_MAP[skill]) {
    SKILL_TRANSLATIONS_MAP[skill] = game.i18n.localize(`PF2E.Skill.${capitalize(skill)}`);
  }
  return  SKILL_TRANSLATIONS_MAP[skill];
};

export const getSkillsForLevel = (characterData, targetLevel) => {
  const levelsArray = characterData?.class?.system?.skillIncreaseLevels?.value;

  if (!levelsArray.includes(targetLevel)) return [];

  const maxProficiency = getMaxSkillProficiency(targetLevel);

  return Object.values(characterData?.skills)
    .filter((skill) => skill.rank < maxProficiency)
    .map((skill) => ({ ...skill, class: getSkillRankClass(skill.rank) }));
};

export const getAssociatedSkills = (prerequisites) => {
  if (!prerequisites || !Array.isArray(prerequisites.value)) {
    return [];
  }

  return prerequisites.value
    .flatMap((prereq) => {
      const matches = SKILLS.filter((skill) =>
        new RegExp(`\\b${skill}\\b`, 'i').test(prereq.value)
        || new RegExp(`\\b${getSkillTranslation(skill)}\\b`, 'i').test(prereq.value)
      );
      return matches;
    })
    .filter(Boolean);
};
