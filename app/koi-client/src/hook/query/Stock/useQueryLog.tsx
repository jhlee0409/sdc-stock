import { useQuery } from 'lib-react-query';
import { Response } from 'shared~type-stock';
import { serverApiUrl } from '../../../config/baseUrl';

interface Props {
  stockId: string;
  userId?: string;
  round?: number;
}

const useQueryLog = ({ stockId, userId, round }: Props) => {
  const { data } = useQuery<Response.Log[]>({
    api: {
      hostname: serverApiUrl,
      method: 'GET',
      pathname: `/stock/log?stockId=${stockId}&userId=${userId}&round=${round}`,
    },
    reactQueryOption: {
      enabled: !!stockId && !!userId,
      refetchInterval: 1500,
    },
  });

  if (!data) {
    return { data: [] };
  }

  data.forEach((v) => {
    v.date = new Date(v.date);
  });

  return { data };
};

export default useQueryLog;
