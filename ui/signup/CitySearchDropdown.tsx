import { useState, useEffect, useRef } from "react";
import { Command } from "cmdk";
import { searchCitiesAction } from "@/lib/directory/searchCitiesAction";
import type { City } from "@/lib/directory/searchCitiesAction";
import { withFieldBorderState } from "@/ui/common/forms/styles";

type CityWithFullLabel = City & { fullLabel?: string };

interface CitySearchDropdownProps {
  value: string;
  onChange: (_value: string | CityWithFullLabel) => void;
  placeholder?: string;
}

export default function CitySearchDropdown({
  value,
  onChange,
  placeholder,
}: CitySearchDropdownProps) {
  const [show, setShow] = useState(false);
  const [results, setResults] = useState<City[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const fetchCities = async () => {
      const result = await searchCitiesAction(query);
      if (cancelled) return;
      if (result.ok) {
        setResults(result.data || []);
      } else {
        setResults([]);
      }
    };

    void fetchCities();
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (!show) return;

    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShow(false);
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [show]);

  const fullLabel = (c: City): string => {
    const name = c.city_ascii || c.city;
    if (!c.admin_name) return `${name}, ${c.country}`;
    return `${name}, ${c.admin_name}, ${c.country}`;
  };

  const dropdownVisible = show && value.trim().length >= 2;

  return (
    <div ref={containerRef} className="w-full relative">
      <Command shouldFilter={false}>
        <Command.Input
          value={value}
          onValueChange={(nextValue) => {
            onChange(nextValue);
            setShow(nextValue.trim().length >= 2);
          }}
          onFocus={() => {
            if (value.trim().length >= 2) setShow(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`}
        />

        {dropdownVisible && (
          <Command.List className="absolute left-0 right-0 z-[1001] mt-1 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            {results.length > 0 ? (
              results.map((c, index) => (
                <Command.Item
                  key={`${c.city_ascii}-${c.admin_name}-${c.country}-${index}`}
                  value={`${fullLabel(c)}-${index}`}
                  onSelect={() => {
                    onChange({
                      ...c,
                      fullLabel: fullLabel(c),
                    });
                    setShow(false);
                  }}
                  className="group px-3 py-2 text-sm cursor-pointer flex flex-col text-gray-800 font-semibold transition-colors hover:bg-[var(--color-brand-blue)]/90 hover:text-white data-[selected=true]:bg-[var(--color-brand-blue)]/90 data-[selected=true]:text-white"
                >
                  <span className="truncate">{fullLabel(c)}</span>
                </Command.Item>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">No matches</div>
            )}
          </Command.List>
        )}
      </Command>
    </div>
  );
}
