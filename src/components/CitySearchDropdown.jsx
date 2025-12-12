import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function CitySearchDropdown({
  value,
  onChange,
  placeholder,
}) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!value || value.length < 2) {
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("worldcities")
        .select("id, city_ascii, city, admin_name, country")
        .ilike("city_ascii", `%${value}%`)
        .limit(20);

      if (!error) setResults(data || []);
    };

    fetchCities();
  }, [value]);

  const fullLabel = (c) => {
    const name = c.city_ascii || c.city;
    if (!c.admin_name) return `${name}, ${c.country}`;
    return `${name}, ${c.admin_name}, ${c.country}`;
  };

  return (
    <div className="w-full relative">
      <input
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          setShow(v.length >= 2); // only show dropdown when searching
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400"
      />

      {show && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#0a1126]/80 bg-[#0a1126]/90 backdrop-blur-md shadow-xl">
          {results.length > 0 ? (
            results.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onChange({
                    ...c,
                    fullLabel: fullLabel(c),
                  });
                  setShow(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer flex flex-col text-white font-semibold hover:bg-[#060b17]/95"
              >
                <span>{fullLabel(c)}</span>
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
