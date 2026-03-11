import React from "react";
import styles from "./Pagination.module.css";

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return { pageNumbers, startPage, endPage };
  };

  const { pageNumbers, startPage, endPage } = getPageNumbers();

  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationInfo}>
        Hiển thị {indexOfFirstItem}-{indexOfLastItem} trong tổng số {totalItems}{" "}
        sản phẩm
      </div>

      <div className={styles.paginationControls}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.paginationButton}
        >
          « Trước
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className={styles.paginationButton}
            >
              1
            </button>
            {startPage > 2 && (
              <span className={styles.paginationDots}>...</span>
            )}
          </>
        )}

        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`${styles.paginationButton} ${
              currentPage === number ? styles.activePage : ""
            }`}
          >
            {number}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className={styles.paginationDots}>...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className={styles.paginationButton}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.paginationButton}
        >
          Tiếp »
        </button>
      </div>

      <div className={styles.itemsPerPageSelector}>
        <label>
          Hiển thị:
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className={styles.itemsPerPageSelect}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          mục/trang
        </label>
      </div>
    </div>
  );
};

export default Pagination;
