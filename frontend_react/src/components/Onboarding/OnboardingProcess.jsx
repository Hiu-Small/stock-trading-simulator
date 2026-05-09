import React, { useState, useContext, useEffect } from 'react';
import OnboardingLayout from './OnboardingLayout';
import KYCStep from './KYCStep';
import PINStep from './PINStep';
import { UserContext } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

const OnboardingProcess = () => {
    const { user } = useContext(UserContext);
    const [currentStep, setCurrentStep] = useState(2); // Start at step 2 for KYC
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.isAuthenticated) {
            if (user.account?.status === 'KYC_COMPLETED') {
                setCurrentStep(3); // Go to PIN setup
            } else if (user.account?.status === 'ACTIVE') {
                navigate('/'); // Already finished onboarding
            }
        } else {
            navigate('/'); // Not logged in
        }
    }, [user, navigate]);

    const handleNext = () => {
        setCurrentStep(prev => prev + 1);
    };

    return (
        <OnboardingLayout 
            step={currentStep} 
            title={currentStep === 2 ? "Định danh cá nhân (eKYC)" : "Thiết lập mã PIN giao dịch"}
        >
            {currentStep === 2 && <KYCStep onNext={handleNext} />}
            {currentStep === 3 && <PINStep />}
        </OnboardingLayout>
    );
};

export default OnboardingProcess;
