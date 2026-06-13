import { createSlice } from "@reduxjs/toolkit";
import { encryptData, decryptData } from "../../utils/encryptDecreptUtils";

const initialState = {
  formData: {},
  canAddNewEntry: false,
};

export const FormSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    setFormData: (state, action) => {
      const { formData } = action.payload;
      state.formData = encryptData(formData);
    },
    removeFormData: (state) => {
      state.formData = {};
    },
    setCanAddNewEntryy: (state, action) => {
      state.canAddNewEntry = action.payload;
    },
  },
});

export const { setFormData, removeFormData, setCanAddNewEntryy } = FormSlice.actions;
export default FormSlice.reducer;

export const selectFormData = (state) => decryptData(state.form.formData);
