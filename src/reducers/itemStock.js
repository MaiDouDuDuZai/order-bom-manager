// reducer
export default function (state, action) {
  const blankItemStock={
    item_name:{ value:'' },
    desc:{ value:'' },
    unit:{ value:'' },
    cate:{ value:'' },
    qty:{ value:0 },
    ceil:{ value:false },
  };
  if (!state) {
    state = {...blankItemStock}
  }
  switch (action.type) {
    case 'INIT_ITEMSTOCK':
      return {...blankItemStock}
    case 'UPDATE_ITEMSTOCK':
      return {
        ...state,
        ...action.itemStock
      }
    default:
      return state
  }
}