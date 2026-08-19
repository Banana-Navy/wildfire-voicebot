import { STATUS_BASE_URL } from './access-data.mjs';

export const DAILY_ACCESS_TOOL_IDS = {
  resolve_official_place: 'tool_2601m0d59rbff80b5havcr1fb286',
  get_daily_access_status: 'tool_7301m0d59rbgec9b0ywzzxq0dv2r',
};

const parameter = (description) => ({ type: 'string', description });

const baseWebhook = (name, description, url, pathParams) => ({
  type: 'webhook',
  name,
  description,
  response_timeout_secs: 8,
  disable_interruptions: true,
  interruption_mode: 'disable_during_tool_and_turn',
  force_pre_tool_speech: false,
  pre_tool_speech: 'off',
  assignments: [],
  tool_call_sound: null,
  tool_call_sound_behavior: 'auto',
  tool_error_handling_mode: 'auto',
  dynamic_variables: { dynamic_variable_placeholders: {} },
  execution_mode: 'immediate',
  api_schema: {
    request_headers: {},
    kind: 'webhook',
    url,
    method: 'GET',
    path_params_schema: pathParams,
    query_params_schema: null,
    request_body_schema: null,
    response_body_schema: null,
    response_filter: null,
    content_type: 'application/json',
    auth_resolved_params: [],
    auth_connection: null,
  },
});

export function dailyAccessTools() {
  return [
    baseWebhook(
      'resolve_official_place',
      "À utiliser silencieusement pour toute question sur le niveau de vigilance ou l'accès actuel à une forêt, réserve, zone naturelle, commune, province, route ou barrage en Belgique. Transforme uniquement le nom prononcé en minuscules sans accents, avec des tirets à la place des espaces et apostrophes; retire seulement un article initial comme la, le, les, de ou het. Exemple : « la forêt de Chimay » devient « foret-de-chimay ». N'invente jamais un autre lieu. Attends le résultat avant toute réponse. Si ambiguous vaut true, demande seulement la commune ou la province.",
      `${STATUS_BASE_URL}/places/{place_slug}.json`,
      {
        place_slug: parameter(
          "Nom exact entendu, normalisé en minuscules sans accents et séparé par des tirets. Ne jamais ajouter une commune ou une province non dite par l'appelant.",
        ),
      },
    ),
    baseWebhook(
      'get_daily_access_status',
      "À appeler silencieusement après resolve_official_place avec exactement le status_key retourné. Cette source donne le code officiel quotidien, les fermetures explicitement publiées, la date de validité et l'état de fraîcheur. Utilise uniquement les faits renvoyés. Un code de risque ne prouve jamais l'ouverture d'un site. Pour la Wallonie, applique same_entity_rule. Si aucune mesure ne nomme exactement la même entité, utilise no_match_answer_template dans la langue active et ne déduis jamais que le lieu est hors périmètre, non concerné, ouvert ou accessible.",
      `${STATUS_BASE_URL}/status/{status_key}.json`,
      {
        status_key: parameter(
          'Copier exactement le status_key renvoyé par resolve_official_place, sans le traduire ni le modifier.',
        ),
      },
    ),
  ];
}
