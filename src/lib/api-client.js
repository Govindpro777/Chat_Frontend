import axios from "axios";
import { HOST } from "./constants";
import { useAppStore } from "@/store";

const apiClient = axios.create({
  baseURL: HOST,
});

apiClient.interceptors.response.use(
  (response) => {
    useAppStore.getState().endRequest();
    return response;
  },
  (error) => {
    useAppStore.getState().endRequest();
    return Promise.reject(error);
  }
);

apiClient.interceptors.request.use(
  (config) => {
    useAppStore.getState().startRequest();
    const token = localStorage.getItem("access-token");

    if (
      token &&
      !config.url.includes("/login") &&
      !config.url.includes("/signup")
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    useAppStore.getState().endRequest();
    return Promise.reject(error);
  }
);

export default apiClient;
