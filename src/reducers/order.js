import moment from 'moment';
// reducer
export default function (state, action) {
  const blankOrder={
    product_name:{ value:'' },
    qty:{ value:0 },
    date:{ value:moment() },
    customer_name:{ value:'' },
    note:{ value:'' },
    status:{ value:'未生产' },
  };
  if (!state) {
    state = {...blankOrder}
  }
  switch (action.type) {
    case 'INIT_ORDER':
      return {...blankOrder}
    case 'UPDATE_ORDER':
      // 更新当前订单
      return {
        ...state,
        ...action.order
      }
    default:
      return state
  }
}