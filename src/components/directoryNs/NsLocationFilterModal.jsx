export default function NsLocationFilterModal({
  locationSearch,
  setLocationSearch,
  filteredLocationOptions,
  locationFilter,
  setLocationFilter,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-3xl rounded-t-xl border border-gray-900 bg-white md:rounded-none">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4 text-gray-500"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M20 20l-3-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={locationSearch}
            onChange={(event) => setLocationSearch(event.target.value)}
            placeholder="Location"
            className="w-full text-sm focus:outline-none"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-4 py-2">
          <button
            type="button"
            onClick={() => {
              setLocationFilter([]);
              onClose?.();
            }}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${
              locationFilter.length === 0 ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <span className="h-4 w-4 rounded-full border border-gray-500" />
            All locations
          </button>
          {filteredLocationOptions.map((group) => (
            <div key={group.country} className="mt-3">
              <div className="text-xs font-semibold uppercase text-gray-500">
                {group.flag ? `${group.flag} ` : ""}
                {group.country}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {group.cities.map((city) => {
                  const key = `${group.country}|||${city}`;
                  const isSelected = locationFilter.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setLocationFilter((prev) => {
                          if (prev.includes(key)) {
                            return prev.filter((item) => item !== key);
                          }
                          return [...prev, key];
                        });
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${
                        isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full border border-gray-500" />
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-gray-900 bg-gray-900 py-2 text-sm font-semibold uppercase text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
