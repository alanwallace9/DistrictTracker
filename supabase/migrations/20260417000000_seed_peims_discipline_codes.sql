-- Seed official 2024 Texas PEIMS DAEP discipline codes
-- Source: PEIMS Discipline Data Chart for Determining DAEP Placements and Expulsions (2024)
-- These codes apply to school districts (not charter schools except code 11)
-- Uses ON CONFLICT DO UPDATE so re-running is safe

INSERT INTO daep_discipline_codes (tenant_id, code, label, mandatory_placement, active)
SELECT
  t.tenant_id,
  c.code,
  c.label,
  c.mandatory_placement,
  true
FROM (
  VALUES
    ('01', 'Permanent Removal by Teacher from Class',                                  false),
    ('02', 'Conduct Punishable as a Felony',                                           true),
    ('05', 'Possessed/Sold/Used/Under Influence of Alcoholic Beverage',                true),
    ('06', 'Abuse of a Volatile Chemical',                                             true),
    ('07', 'Public Lewdness or Indecent Exposure',                                     true),
    ('08', 'Retaliation Against School Employee',                                      true),
    ('09', 'Off-Campus Felony (Title 5 Penal Code)',                                   true),
    ('10', 'Off-Campus Felony (Not Title 5)',                                          false),
    ('11', 'Brought Firearm to School / Unlawful Carrying of Handgun',                 true),
    ('12', 'Unlawful Carrying of Location-Restricted Knife',                           true),
    ('14', 'Prohibited Weapons Under Penal Code 46.05',                                true),
    ('16', 'Arson',                                                                    true),
    ('17', 'Murder / Capital Murder / Criminal Attempt',                               true),
    ('18', 'Indecency with a Child',                                                   true),
    ('19', 'Aggravated Kidnapping',                                                    true),
    ('21', 'Violation of Student Code of Conduct',                                     false),
    ('22', 'Criminal Mischief (Felony)',                                               false),
    ('23', 'Emergency Placement / Expulsion',                                          false),
    ('25', 'Bullying / Cyberbullying',                                                 false),
    ('26', 'Terroristic Threat',                                                       true),
    ('27', 'Assault Against School District Employee or Volunteer',                    true),
    ('28', 'Assault Against Non-Employee or Volunteer',                                true),
    ('29', 'Aggravated Assault Against School District Employee or Volunteer',         true),
    ('30', 'Aggravated Assault Against Non-Employee or Volunteer',                     true),
    ('31', 'Sexual Assault Against School District Employee or Volunteer',             true),
    ('32', 'Sexual Assault Against Non-Employee or Volunteer',                         true),
    ('35', 'False Alarm / False Report',                                               true),
    ('36', 'Felony Controlled Substance Violation',                                    true),
    ('41', 'Fighting / Mutual Combat',                                                 false),
    ('46', 'Aggravated Robbery',                                                       true),
    ('47', 'Manslaughter',                                                             true),
    ('48', 'Criminally Negligent Homicide',                                            true),
    ('49', 'Engages in Deadly Conduct',                                                false),
    ('55', 'Sex Offender Registration (Under Court Supervision)',                      true),
    ('56', 'Sex Offender Registration (Not Under Court Supervision)',                  false),
    ('57', 'Continuous Sexual Abuse of Young Child or Disabled Individual',            true),
    ('58', 'Breach of Computer Security',                                              false),
    ('59', 'Serious Misbehavior in a DAEP',                                           false),
    ('60', 'Harassment Against School District Employee',                              true),
    ('61', 'Bullying',                                                                 false),
    ('62', 'Possessed/Sold/Used/Delivered Marihuana or THC',                          true),
    ('63', 'Possessed/Sold/Delivered E-Cigarette',                                    true),
    ('64', 'Possessed/Sold/Used/Delivered Other Controlled Substance',                 true),
    ('65', 'Threatens Immediate Health and Safety of Others',                          true),
    ('66', 'Controlled Substance - Delivery (Felony)',                                 true),
    ('67', 'Possesses or Uses E-Cigarette',                                            false)
) AS c(code, label, mandatory_placement)
CROSS JOIN (SELECT DISTINCT tenant_id FROM daep_discipline_codes) AS t
ON CONFLICT (tenant_id, code) DO UPDATE
  SET label              = EXCLUDED.label,
      mandatory_placement = EXCLUDED.mandatory_placement,
      active             = true;
