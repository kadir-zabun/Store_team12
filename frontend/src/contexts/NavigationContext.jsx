import { createContext, useContext } from "react";

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
    return (
        <NavigationContext.Provider value={{}}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        return { isLoading: false, setIsLoading: () => {} };
    }
    return context;
}

