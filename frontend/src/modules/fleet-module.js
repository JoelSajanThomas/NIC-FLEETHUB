/**
 * Fleet & Heavy Equipment Module
 */
import { fleetApi } from "../api/fleet.js";

export const fleetModule = {
  loadFleet: async (params) => {
    return await fleetApi.getAssets(params);
  },
  registerAsset: async (assetData) => {
    return await fleetApi.createAsset(assetData);
  },
  relocateAsset: async (id, transferData) => {
    return await fleetApi.relocateAsset(id, transferData);
  }
};

export default fleetModule;
