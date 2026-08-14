import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { priceSurveysApi } from '../../api/price-surveys.api';
import type { FindSubmissionsParams, SaveSubmissionPayload } from '../../api/price-surveys.api';
import type { PriceSurveyAssignment, PriceSurveySubmission } from '../../types';

interface PriceSurveysState {
  /** The live draft for whichever (user, store) was last fetched. */
  draft: PriceSurveySubmission | null;
  /** What's being displayed — equals `draft` unless an admin picked a historical round. */
  viewed: PriceSurveySubmission | null;
  assignments: PriceSurveyAssignment[];
  submissions: PriceSurveySubmission[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: PriceSurveysState = {
  draft: null,
  viewed: null,
  assignments: [],
  submissions: [],
  loading: false,
  saving: false,
  error: null,
};

export const fetchDraft = createAsyncThunk(
  'priceSurveys/fetchDraft',
  async ({ storeId, userId }: { storeId: string; userId?: string }, { rejectWithValue }) => {
    try { return await priceSurveysApi.getDraft(storeId, userId); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const saveDraft = createAsyncThunk(
  'priceSurveys/saveDraft',
  async ({ id, payload }: { id: string; payload: SaveSubmissionPayload }, { rejectWithValue }) => {
    try { return await priceSurveysApi.saveSubmission(id, payload); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const startNewRound = createAsyncThunk(
  'priceSurveys/startNewRound',
  async (id: string, { rejectWithValue }) => {
    try { return await priceSurveysApi.newRound(id); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchAssignments = createAsyncThunk(
  'priceSurveys/fetchAssignments',
  async ({ userId, storeId }: { userId: string; storeId: string }, { rejectWithValue }) => {
    try { return await priceSurveysApi.getAssignments(userId, storeId); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const saveAssignments = createAsyncThunk(
  'priceSurveys/saveAssignments',
  async (
    { userId, storeId, productIds }: { userId: string; storeId: string; productIds: string[] },
    { rejectWithValue },
  ) => {
    try {
      return await priceSurveysApi.setAssignments({ user_id: userId, store_id: storeId, product_ids: productIds });
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const fetchSubmissions = createAsyncThunk(
  'priceSurveys/fetchSubmissions',
  async (params: FindSubmissionsParams | undefined, { rejectWithValue }) => {
    try { return await priceSurveysApi.listSubmissions(params); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

export const fetchSubmission = createAsyncThunk(
  'priceSurveys/fetchSubmission',
  async (id: string, { rejectWithValue }) => {
    try { return await priceSurveysApi.getSubmission(id); }
    catch (err) { return rejectWithValue((err as Error).message); }
  },
);

const priceSurveysSlice = createSlice({
  name: 'priceSurveys',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearViewed(state) { state.viewed = state.draft; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDraft.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDraft.fulfilled, (state, action) => {
        state.loading = false;
        state.draft = action.payload;
        state.viewed = action.payload;
      })
      .addCase(fetchDraft.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      .addCase(saveDraft.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(saveDraft.fulfilled, (state, action) => {
        state.saving = false;
        state.draft = action.payload;
        state.viewed = action.payload;
      })
      .addCase(saveDraft.rejected, (state, action) => { state.saving = false; state.error = action.payload as string; })

      .addCase(startNewRound.fulfilled, (state, action) => {
        state.draft = action.payload;
        state.viewed = action.payload;
      })

      .addCase(fetchAssignments.fulfilled, (state, action) => { state.assignments = action.payload; })

      .addCase(saveAssignments.fulfilled, (state, action) => { state.assignments = action.payload; })

      .addCase(fetchSubmissions.fulfilled, (state, action) => { state.submissions = action.payload; })

      .addCase(fetchSubmission.fulfilled, (state, action) => { state.viewed = action.payload; });
  },
});

export const { clearError, clearViewed } = priceSurveysSlice.actions;
export default priceSurveysSlice.reducer;
