// ISO 3166-1 alpha-2 country codes with names and emoji flags.
export type Country = { code: string; name: string; flag: string };

function flagFromCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const RAW: [string, string][] = [
  ["AF","Afghanistan"],["AL","Albania"],["DZ","Algeria"],["AD","Andorra"],["AO","Angola"],["AR","Argentina"],["AM","Armenia"],["AU","Australia"],["AT","Austria"],["AZ","Azerbaijan"],
  ["BH","Bahrain"],["BD","Bangladesh"],["BY","Belarus"],["BE","Belgium"],["BZ","Belize"],["BJ","Benin"],["BO","Bolivia"],["BA","Bosnia and Herzegovina"],["BW","Botswana"],["BR","Brazil"],
  ["BN","Brunei"],["BG","Bulgaria"],["BF","Burkina Faso"],["BI","Burundi"],["KH","Cambodia"],["CM","Cameroon"],["CA","Canada"],["CV","Cape Verde"],["CF","Central African Republic"],["TD","Chad"],
  ["CL","Chile"],["CN","China"],["CO","Colombia"],["KM","Comoros"],["CG","Congo"],["CD","Congo (DRC)"],["CR","Costa Rica"],["HR","Croatia"],["CU","Cuba"],["CY","Cyprus"],
  ["CZ","Czechia"],["DK","Denmark"],["DJ","Djibouti"],["DO","Dominican Republic"],["EC","Ecuador"],["EG","Egypt"],["SV","El Salvador"],["EE","Estonia"],["ET","Ethiopia"],["FI","Finland"],
  ["FR","France"],["GA","Gabon"],["GM","Gambia"],["GE","Georgia"],["DE","Germany"],["GH","Ghana"],["GR","Greece"],["GT","Guatemala"],["GN","Guinea"],["GY","Guyana"],
  ["HT","Haiti"],["HN","Honduras"],["HK","Hong Kong"],["HU","Hungary"],["IS","Iceland"],["IN","India"],["ID","Indonesia"],["IR","Iran"],["IQ","Iraq"],["IE","Ireland"],
  ["IL","Israel"],["IT","Italy"],["JM","Jamaica"],["JP","Japan"],["JO","Jordan"],["KZ","Kazakhstan"],["KE","Kenya"],["KW","Kuwait"],["KG","Kyrgyzstan"],["LA","Laos"],
  ["LV","Latvia"],["LB","Lebanon"],["LY","Libya"],["LI","Liechtenstein"],["LT","Lithuania"],["LU","Luxembourg"],["MO","Macao"],["MG","Madagascar"],["MW","Malawi"],["MY","Malaysia"],
  ["MV","Maldives"],["ML","Mali"],["MT","Malta"],["MR","Mauritania"],["MU","Mauritius"],["MX","Mexico"],["MD","Moldova"],["MC","Monaco"],["MN","Mongolia"],["ME","Montenegro"],
  ["MA","Morocco"],["MZ","Mozambique"],["MM","Myanmar"],["NA","Namibia"],["NP","Nepal"],["NL","Netherlands"],["NZ","New Zealand"],["NI","Nicaragua"],["NE","Niger"],["NG","Nigeria"],
  ["KP","North Korea"],["MK","North Macedonia"],["NO","Norway"],["OM","Oman"],["PK","Pakistan"],["PS","Palestine"],["PA","Panama"],["PG","Papua New Guinea"],["PY","Paraguay"],["PE","Peru"],
  ["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["QA","Qatar"],["RO","Romania"],["RU","Russia"],["RW","Rwanda"],["SM","San Marino"],["SA","Saudi Arabia"],["SN","Senegal"],
  ["RS","Serbia"],["SG","Singapore"],["SK","Slovakia"],["SI","Slovenia"],["SO","Somalia"],["ZA","South Africa"],["KR","South Korea"],["ES","Spain"],["LK","Sri Lanka"],["SD","Sudan"],
  ["SE","Sweden"],["CH","Switzerland"],["SY","Syria"],["TW","Taiwan"],["TJ","Tajikistan"],["TZ","Tanzania"],["TH","Thailand"],["TG","Togo"],["TT","Trinidad and Tobago"],["TN","Tunisia"],
  ["TR","Turkey"],["TM","Turkmenistan"],["UG","Uganda"],["UA","Ukraine"],["AE","United Arab Emirates"],["GB","United Kingdom"],["US","United States"],["UY","Uruguay"],["UZ","Uzbekistan"],
  ["VE","Venezuela"],["VN","Vietnam"],["YE","Yemen"],["ZM","Zambia"],["ZW","Zimbabwe"],
];

export const COUNTRIES: Country[] = RAW.map(([code, name]) => ({ code, name, flag: flagFromCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export function getCountry(code?: string | null): Country | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

export function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
