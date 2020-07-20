// reducer
export default function (state, action) {
  const blankProduct={
    product_name:{ value:'' },
    procedure:[],
    scrap_rate: 0,
    note:{ value:'' },
  };
  if (!state) {
    state = {...blankProduct}
  }
  switch (action.type) {
    case 'INIT':
      return {...blankProduct};
    case 'UPDATE':
      // 更新当前订单
      let product={
        ...state,
        ...action.product
      };
      return product;
    default:
      return state;
  }
}