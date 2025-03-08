// src/hooks/use-media-query.js

import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        // Create a media query list based on the provided query
        const mediaQueryList = window.matchMedia(query);

        // Function to handle changes to the media query
        const handleChange = () => {
            setMatches(mediaQueryList.matches);
        };

        // Add the event listener for the media query change
        mediaQueryList.addEventListener('change', handleChange);

        // Set the initial state based on the current media query match
        setMatches(mediaQueryList.matches);

        // Cleanup the event listener on component unmount
        return () => {
            mediaQueryList.removeEventListener('change', handleChange);
        };
    }, [query]);

    return matches;
};

