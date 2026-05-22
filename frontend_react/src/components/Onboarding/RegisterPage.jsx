import React from 'react';
import OnboardingLayout from './OnboardingLayout';
import RegisterStep from './RegisterStep';
import { useTranslation } from '../../context/LanguageContext';

const RegisterPage = () => {
    const { t } = useTranslation();
    return (
        <OnboardingLayout 
            step={1} 
            title={t("onboarding.registerTitle")}
        >
            <RegisterStep />
        </OnboardingLayout>
    );
};

export default RegisterPage;
