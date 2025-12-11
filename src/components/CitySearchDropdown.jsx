import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function CitySearchDropdown({
  value,
  onChange,
  placeholder = "Search nearest city…",
}) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState([]);

  // fetch matching cities when value changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!value || value.length < 2) {
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("worldcities")
        .select("id, city_ascii, city, country, admin_name")
        .or(
          `city_ascii.ilike.%${value}%,city.ilike.%${value}%`
        )
        .limit(30);

      if (!error) {
        // Remove duplicates (same city + state + country)
        const unique = [];
        const seen = new Set();

        for (const c of data || []) {
          const key = `${c.city_ascii || c.city}|${c.admin_name}|${c.country}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(c);
          }
        }

        setResults(unique);
      }
    };

    fetchCities();
  }, [value]);

  return (
    <div className="w-full relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400"
      />

      {show && value && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#0a1126]/80 bg-[#0a1126]/90 backdrop-blur-md shadow-xl">
          {results.length > 0 ? (
            results.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onChange({
                    ...c,
                    display: [
                        c.city_ascii || c.city,
                        c.admin_name,
                        c.country
                    ].filter(Boolean).join(", ")
                    });
                     // return full city object
                  setShow(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer flex flex-col text-white font-semibold hover:bg-[#060b17]/95"
              >
                <span>{c.city_ascii || c.city}</span>

                <span className="text-xs opacity-60">
                  {c.admin_name
                    ? `${c.admin_name}, ${c.country}`
                    : c.country}
                </span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-white/90 font-medium">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
