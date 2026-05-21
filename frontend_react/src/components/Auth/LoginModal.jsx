import React, { useState, useContext } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser } from "../../services/userService";
import { UserContext } from "../../context/UserContext";
import "./LoginModal.scss";
import loginBg from "../../assets/images/login-bg.svg";

const LoginModal = (props) => {
  const { loginContext } = useContext(UserContext);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response = await loginUser(formData.username, formData.password);
      console.log(">>> Check login response:", response);
      if (response && response.EC === 0) {
        let data = {
          isAuthenticated: true,
          token: response.DT.access_token,
          account: {
            username: response.DT.user.username,
            role: response.DT.user.role,
            status: response.DT.user.status,
          }
        };
        sessionStorage.setItem("account", JSON.stringify({
          token: data.token,
          username: data.account.username,
          role: data.account.role,
          status: data.account.status
        }));
        loginContext(data); // Update global state
        toast.success(response.EM);
        props.handleClose();

        if (data.account.role === "ADMIN") {
          navigate("/admin");
        } else if (data.account.status === 'UNVERIFIED' || data.account.status === 'KYC_COMPLETED') {
          navigate("/onboarding");
        } else {
          navigate("/");
        }
      } else {
        toast.error(response.EM);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (!props.show) return null;

  return (
    <div className="login-modal-overlay" onClick={props.handleClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="login-container">
          <button className="btn-close-custom" onClick={props.handleClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="login-left">
            <img src={loginBg} alt="Login Background" className="bg-image" />
          </div>

          <div className="login-right">
            <h2 className="login-title">Đăng nhập</h2>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>Số tài khoản / Số điện thoại</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Nhập STK hoặc SĐT"
                  value={formData.username}
                  onChange={handleInputChange}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                    required
                  />
                  <span
                    className="toggle-password"
                    onClick={togglePasswordVisibility}
                  >
                    <i
                      className={`fa-solid ${
                        showPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </span>
                </div>
              </div>

              <div className="forgot-password">
                <a href="#forgot">Quên mật khẩu</a>
              </div>

              <button type="submit" className="btn-login-submit">
                Đăng nhập
              </button>
            </form>

            <div className="social-divider">
              <span>Hoặc đăng nhập tài khoản trải nghiệm với</span>
            </div>

            <div className="social-actions">
              <button className="btn-social google">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google G Logo" />              
              </button>
              <button className="btn-social facebook">
                <i className="fa-brands fa-facebook-f"></i>
              </button>
            </div>

            <div className="open-account-link">
              <a 
                href="#open-account"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleClose();
                  navigate("/register");
                }}
              >
                Mở tài khoản giao dịch
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
