import React, { useState } from "react";
import styles from "./SidebarMenu.module.css";
import { useNavigate, useLocation } from "react-router-dom";

const SidebarMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Function to check if current path matches menu item
  const isActiveMenuItem = (path) => {
    return location.pathname === path;
  };

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false); // Close sidebar after navigation on mobile
  };

  return (
    <>
      {/* Nút hamburger chỉ hiển thị khi sidebar đóng */}
      <button
        className={`${styles.hamburgerBtn} ${isOpen ? styles.hidden : ""}`}
        onClick={toggleSidebar}
      >
        &#9776;
      </button>

      <div className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.closeBtn} onClick={toggleSidebar}>
            &lt;&lt;
          </button>
          <h2 className={styles.sidebarTitle}>Bảng điều khiển</h2>
        </div>

        <ul className={styles.sidebarMenu}>
          <li
            className={`${styles.menuItem} ${
              isActiveMenuItem("/admin/user") || isActiveMenuItem("/")
                ? styles.active
                : ""
            }`}
            onClick={() => handleNavigation("/admin/user")}
          >
            <div
              className={
                isActiveMenuItem("/admin/user") || isActiveMenuItem("/")
                  ? styles.highlight
                  : ""
              }
            >
              Quản lý người dùng
            </div>
          </li>
          <li
            className={`${styles.menuItem} ${
              isActiveMenuItem("/admin/product") ? styles.active : ""
            }`}
            onClick={() => handleNavigation("/admin/product")}
          >
            <div
              className={
                isActiveMenuItem("/admin/product") ? styles.highlight : ""
              }
            >
              Quản lý sản phẩm
            </div>
          </li>
          <li
            className={`${styles.menuItem} ${
              isActiveMenuItem("/admin/order") ? styles.active : ""
            }`}
            onClick={() => handleNavigation("/admin/order")}
          >
            <div
              className={
                isActiveMenuItem("/admin/order") ? styles.highlight : ""
              }
            >
              Quản lý đơn hàng
            </div>
          </li>
        </ul>
      </div>

      {isOpen && <div className={styles.overlay} onClick={toggleSidebar} />}
    </>
  );
};

export default SidebarMenu;
