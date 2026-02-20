export const usePagination = (pageSize: number = 10) => {
  const currentPage = ref(1);

  const goToPage = (page: number) => {
    currentPage.value = Math.max(1, page);
  };

  const nextPage = () => {
    currentPage.value++;
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  return {
    currentPage,
    goToPage,
    nextPage,
    prevPage,
  };
};
