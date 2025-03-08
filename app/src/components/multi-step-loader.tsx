"use client";

import { Loader2, LoaderCircleIcon, LoaderIcon } from "lucide-react";
import React, { useState, useEffect } from "react";

type LoadingState = {
    text: string;
};

const CheckIcon = ({ className }: { className?: string }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-6 h-6 ${className}`}
        >
            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
};

const CheckFilled = ({ className }: { className?: string }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`w-6 h-6 ${className}`}
        >
            <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                clipRule="evenodd"
            />
        </svg>
    );
};

const LoaderCore = ({
    loadingStates,
    value = 0,
}: {
    loadingStates: LoadingState[];
    value?: number;
}) => {
    return (
        <div className="flex relative justify-start max-w-xl mx-auto flex-col mt-40">
            {loadingStates.map((loadingState, index) => {
                const isActive = index === value; // Current step
                const isCompleted = index < value; // Completed steps
                const isUpcoming = index > value; // Upcoming steps
                const distance = Math.abs(index - value); // Distance from active step
                const blurIntensity = distance * 1; // Blur increases as distance increases
                const scaleFactor = Math.max(1 - distance * 0.1, 0.0); // Scale decreases as distance increases, min scale 0.8
                const opacityFactor = Math.max(1 - distance * 0.5, 0.0); // Opacity decreases with distance, min 0.3


                return (
                    <div
                        key={index}
                        className={`text-left flex gap-2 items-center mb-4 transition-all duration-500 ${isActive ? "opacity-100 scale-110" : "opacity-50"
                            }`}
                        style={{
                            transform: `translateY(${-value * 40}px) scale(${scaleFactor})`,
                            filter: !isActive
                                ? `blur(${blurIntensity}px)`
                                : "blur(0)",
                            opacity: opacityFactor,
                            transition:
                                "transform 0.5s ease-in-out, opacity 0.3s, filter 0.5s",
                        }}
                    >
                        <div>
                            {/* COMPLETED STEP */}
                            {isCompleted && (
                                <CheckFilled className="text-white" />
                            )}
                            {/* CURRENT STEP */}
                            {isActive && (
                                <LoaderCircleIcon className="text-lime-500 animate-spin-slow" />
                                // <CheckFilled className="text-lime-500" />
                            )}
                            {/* UPCOMING STEP */}
                            {isUpcoming && (
                                <CheckIcon className="text-white" />
                            )}
                        </div>
                        <span
                            className={`${isActive
                                ? "text-lime-500 font-semibold"
                                : "text-white"
                                }`}
                        >
                            {loadingState.text}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};




export const MultiStepLoader = ({
    loadingStates,
    loading,
    duration = 2000,
    loop = true,
}: {
    loadingStates: LoadingState[];
    loading?: boolean;
    duration?: number;
    loop?: boolean;
}) => {
    const [currentState, setCurrentState] = useState(0);

    useEffect(() => {
        if (!loading) {
            setCurrentState(0);
            return;
        }
        const timeout = setTimeout(() => {
            setCurrentState((prevState) =>
                loop
                    ? prevState === loadingStates?.length - 1
                        ? 0
                        : prevState + 1
                    : Math.min(prevState + 1, loadingStates?.length - 1)
            );
        }, duration);

        return () => clearTimeout(timeout);
    }, [currentState, loading, loop, loadingStates?.length, duration]);

    return (
        <div
            className={`w-full h-full fixed inset-0 z-50 flex items-center justify-center ${loading ? "backdrop-blur-sm" : "hidden"
                }`}
        >
            <div className="h-96 relative">
                <LoaderCore value={currentState} loadingStates={loadingStates} />
            </div>
            <div className="bg-gradient-to-t inset-x-0 z-20 bottom-0 bg-white dark:bg-black h-full absolute [mask-image:radial-gradient(900px_at_center,transparent_30%,white)]"></div>
        </div>
    );
};
