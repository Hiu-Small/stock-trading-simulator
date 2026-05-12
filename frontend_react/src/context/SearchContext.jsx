import React, { createContext, useState } from 'react';

export const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
    const [searchTicker, setSearchTicker] = useState(null);

    const handleSearch = (ticker) => {
        setSearchTicker(ticker);
    };

    const clearSearch = () => {
        setSearchTicker(null);
    };

    return (
        <SearchContext.Provider value={{ searchTicker, handleSearch, clearSearch }}>
            {children}
        </SearchContext.Provider>
    );
};
