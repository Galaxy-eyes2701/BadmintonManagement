import React from "react";

const SortIcon = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) {
    return (
      <span style={{ opacity: 0.3, marginLeft: "5px", fontSize: "12px" }}>
        ⇅
      </span>
    );
  }

  return (
    <span style={{ marginLeft: "5px", fontSize: "12px" }}>
      {sortDirection === "asc" ? "↑" : "↓"}
    </span>
  );
};

export default SortIcon;
