import React, { useState, useEffect } from 'react';
import Nav from './Nav';
import { useTranslation } from '../../context/LanguageContext';
import "./MainLayout.scss";

const MainLayout = ({ children }) => {
    const [marketStatus, setMarketStatus] = useState('OPEN'); // Default status
    const { t } = useTranslation();

    // Logic to determine market status automatically based on time (VN Time)
    useEffect(() => {
        const updateMarketStatus = () => {
            const now = new Date();
            // Convert to VN Time (UTC+7)
            const vnTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
            const hours = vnTime.getHours();
            const minutes = vnTime.getMinutes();
            const day = vnTime.getDay(); // 0 is Sunday, 6 is Saturday

            let status = 'CLOSED';

            if (day !== 0 && day !== 6) {
                const currentTimeInMinutes = hours * 60 + minutes;
                
                // Market hours (Session 1: 9:00 - 11:30, Session 2: 13:00 - 15:00)
                const morningStart = 9 * 60;
                const morningEnd = 11 * 60 + 30;
                const afternoonStart = 13 * 60;
                const afternoonEnd = 15 * 60;

                if (currentTimeInMinutes >= morningStart && currentTimeInMinutes <= morningEnd) {
                    status = 'OPEN';
                } else if (currentTimeInMinutes > morningEnd && currentTimeInMinutes < afternoonStart) {
                    status = 'BREAK';
                } else if (currentTimeInMinutes >= afternoonStart && currentTimeInMinutes <= afternoonEnd) {
                    status = 'OPEN';
                }
            }

            console.log("Current Market Status:", status);
            setMarketStatus(status);
        };

        updateMarketStatus();
        const interval = setInterval(updateMarketStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="main-layout">
            <div className="marquee-banner">
                <div className="marquee-track">
                    <span className="marquee-item">{t("nav.tickerWarning")}</span>
                    <span className="marquee-item">{t("nav.tickerWarning")}</span>
                </div>
            </div>
            <Nav marketStatus={marketStatus} />
            <main className="content-area">
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
