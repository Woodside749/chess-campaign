// Countries for the profile's flag: two-letter codes (ISO 3166), with their English names
// and flag emoji worked out by the browser.
const CODES =
  'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ')

const names = new Intl.DisplayNames(['en'], { type: 'region' })

// The flag emoji for a code like 'NO' (🇳🇴), or '' for none.
export function flagOf(code) {
  if (!code) return ''
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65))
}

export const countryName = (code) => (code ? names.of(code) : '')

// Every country, sorted by name: [{ code: 'NO', name: 'Norway', flag: '🇳🇴' }, ...].
export const COUNTRIES = CODES.map((code) => ({ code, name: names.of(code), flag: flagOf(code) })).sort((a, b) =>
  a.name.localeCompare(b.name),
)
