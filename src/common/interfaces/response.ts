export interface SuccessResponse<data> {
    isError?: boolean;
    message?: string;
    data? :data;
}

export interface SuccessPaginateResponse<data, totalDocs, recordPerPage, currentPage, totalPages  > {
  isError?: boolean;
  message?: string;
  data? :data;
  totalDocs? :totalDocs;
  recordPerPage? :recordPerPage;
  currentPage? :currentPage;
  totalPages? : totalPages;
}
  