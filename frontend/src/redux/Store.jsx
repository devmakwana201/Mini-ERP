import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Default storage: localStorage
import formReducer from "./slice/FormSlice";
import salesOrderReducer from "./slice/salesOrderSlice";
// import { CompanySlice } from "./slice/CompanySlice";

// Redux Persist Config
const persistConfig = {
    key: "root",
    storage,
    whitelist: ["form", "salesOrders"],
};

// Combine reducers
const rootReducer = combineReducers({
    form: formReducer,
    salesOrders: salesOrderReducer,
});

// Wrap rootReducer with persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Store
export const reduxstore = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Required for Redux Persist
        }),
});

// Create Persistor
export const persistor = persistStore(reduxstore);
