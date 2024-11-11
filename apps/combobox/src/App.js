import { useEffect, useState } from "react";

import SearchSelect from "./components/SearchSelect";

export default function App() {
  const [selectedItems, setSelectedItems] = useState([]);

  const onSelectionChange = (item) => {
    setSelectedItems((items) => {
      return items.find((curItem) => curItem.id === item.id)
        ? items.filter((curItem) => curItem.id !== item.id)
        : [...items, item];
    });
  };

  useEffect(() => {
    console.info(selectedItems);
  }, [searchInItems]);

  return (
    <main className="container mx-auto">
      <SearchSelect
        remoteMethod={remoteMethod}
        onSelectionChange={onSelectionChange}
        maxHeight="320px"
      />
    </main>
  );
}

const jsonUrl = "https://jsonplaceholder.typicode.com/users";

const remoteMethod = async (search, options) => {
  // console.info(search, options);

  if (!search.trim()) {
    return [];
  }

  try {
    const res = await fetch(jsonUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }
    const users = await res.json();
    return searchInItems(search, users);
  } catch (e) {
    console.info("-----error in remote method---");
    console.error(e);
    return Promise.reject(e);
  }
};

function searchInItems(search, items) {
  return items.filter((item) => {
    const keyword = search.toLowerCase();

    const address = Object.values(item)
      .filter((v) => typeof v == "string")
      .join("")
      .toLowerCase();

    return (
      item.name.toLowerCase().includes(keyword) ||
      item.username.toLowerCase().includes(keyword) ||
      item.website.toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword) ||
      address.includes(search)
    );
  });
}
