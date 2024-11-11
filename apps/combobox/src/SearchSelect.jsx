import { useCallback, useState, useRef, useEffect } from "react";
import cn from "../utils/cn";

/**
 * Custom hook for debouncing values
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - The debounced value
 */
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value.trim()), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for managing API state and operations
 */

/**
 * Custom hook for managing keyboard navigation
 */

/**
 * SelectSearch Component
 * A multi-select searchable dropdown with keyboard navigation and accessibility support
 */
export default function SelectSearch({
  remoteMethod,
  debounce = 250,
  placeholder = "Search...",
  maxHeight,
  emptyMessage = "No results found",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const inputRef = useRef(null);
  const listboxRef = useRef(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, debounce);

  // API state management
  const [apiStatus, setApiStatus] = useState("idle");
  const [apiError, setApiError] = useState(null);
  const [apiData, setApiData] = useState([]);
  const abortControllerRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) return;

      const optionsLength = apiData?.length ?? 0;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((prev) =>
            prev < optionsLength - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Home":
          event.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          event.preventDefault();
          setActiveIndex(optionsLength - 1);
          break;
        case "Enter":
          event.preventDefault();
          if (activeIndex >= 0 && apiData[activeIndex]) {
            setSelectedItem(apiData[activeIndex]);
            setIsOpen(false);
            setSearchTerm(apiData[activeIndex].name);
          }
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    },
    [apiData, isOpen, activeIndex],
  );

  const resetApiState = useCallback(() => {
    setApiData([]);
    setApiError(null);
    setApiStatus("idle");
  }, []);

  const fetchOptions = useCallback(
    async (searchTerm, isMounted) => {
      const keyword = searchTerm.trim();

      if (!keyword) {
        resetApiState();
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setApiStatus("loading");
      setApiError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const data = await remoteMethod(searchTerm, {
          signal: abortControllerRef.current.signal,
        });
        if (isMounted) {
          setApiData(data);
          setApiStatus("success");
        }
      } catch (error) {
        if (error.name !== "AbortError" && isMounted) {
          setApiError(error);
          setApiStatus("error");
        }
      }
    },
    [resetApiState],
  );

  // Effect to fetch options when search term changes
  useEffect(() => {
    let isMounted = true;
    fetchOptions(debouncedSearchTerm, isMounted);
    return () => {
      isMounted = false;
    };
  }, [debouncedSearchTerm, fetchOptions]);

  // Handle item selection
  const toggleItem = (item) => {
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  // Handle input focus
  const onInputFocus = () => {
    setIsOpen(true);
    if (apiData.length > 0) {
      setActiveIndex(0);
    }
  };

  const onInputChange = (e) => {
    const searchTerm = e.target.value;
    setSearchTerm(searchTerm);
    setIsOpen(true);
    setActiveIndex(-1);
    setSelectedItem(null);
  };

  return (
    <div>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="search-listbox"
      >
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={onInputChange}
          onFocus={onInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `option-${activeIndex}` : undefined
          }
          className="p-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
      </div>
      {/* {selectedItems.length > 0 && (
        <div role="region" aria-live="polite" className="mb-4">
          <ul role="list" className="flex items-center  gap-1">
            {selectedItems.map((item) => (
              <li
                key={item.id}
                className="mr-1 text-xs flex items-center gap-1 border p-1"
              >
                {item.name}
                <button
                  onClick={() => toggleItem(item)}
                  aria-label={`Remove ${item.label}`}
                  className="mr-1"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )} */}

      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          id="search-listbox"
          aria-multiselectable="true"
          style={{ maxHeight, overflow: "auto" }}
        >
          {apiStatus === "loading" && <li role="status">Loading...</li>}

          {apiStatus === "error" && (
            <li role="alert">{apiError?.message || "Error loading options"}</li>
          )}
          {apiStatus === "success" && apiData.length === 0 && (
            <li role="alert">{emptyMessage}</li>
          )}
          {apiStatus === "success" &&
            apiData.map((item, index) => {
              const isSelected = selectedItem?.id === item.id;
              const isHightlighted = activeIndex === index;

              return (
                <li
                  key={item.id}
                  id={`option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => toggleItem(item)}
                  className={cn("p-1 border my-1", {
                    "bg-green-500 text-white": isSelected,
                    "ring ring-blue-500": isHightlighted,
                  })}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{isSelected && "✔"}</span>
                    <span>{item.name}</span>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
