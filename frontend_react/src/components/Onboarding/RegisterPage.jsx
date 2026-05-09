import React from 'react';
import OnboardingLayout from './OnboardingLayout';
import RegisterStep from './RegisterStep';

const RegisterPage = () => {
    return (
        <OnboardingLayout 
            step={1} 
            title="Khởi tạo tài khoản"
        >
            <RegisterStep />
        </OnboardingLayout>
    );
};

export default RegisterPage;
