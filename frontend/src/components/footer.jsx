const Footer = () => {
  return (
    <footer className="bm-footer">
      <div className="bm-footer-inner">
        <span>© {new Date().getFullYear()} Badminton Management</span>
        <span className="bm-footer-divider">•</span>
        <span>Thiết kế bởi PRN232</span>
      </div>
    </footer>
  );
};

export default Footer;
