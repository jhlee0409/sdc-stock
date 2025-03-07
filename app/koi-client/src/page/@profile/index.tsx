import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { Button, Form, Input, Radio } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { UserStore } from '../../store';
import { Query } from '../../hook';
import AvatarSetter from './component/AvatarSetter';
import MobileLayout from '../../component-presentation/MobileLayout';
import ProfileHeader from './component/ProfileHeader';
import { supabase } from '../../library/supabase';

export default function Profile() {
  const navigate = useNavigate();

  const supabaseSession = useAtomValue(UserStore.supabaseSession);

  const { data, isFetching } = Query.Supabase.useMyProfile({ supabaseSession });

  const [isLoading, setLoading] = useState(isFetching);
  const [username, setUsername] = useState<string>(data?.data?.username);
  const [isDuplicatedUsername, setIsDuplicatedUsername] = useState(false);
  const [gender, setGender] = useState<string>(data?.data?.gender);

  useEffect(() => {
    setLoading(isFetching);
    setUsername(data?.data?.username);
    setGender(data?.data?.gender);
  }, [data?.data?.gender, data?.data?.username, isFetching]);

  if (!supabaseSession) return <></>;

  const updateProfile: React.MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault();

    if (!supabaseSession) return;

    setLoading(true);

    const { user } = supabaseSession;

    const updates = {
      gender,
      id: user.id,
      updated_at: new Date(),
      username,
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      if (error.code === '23505' && error.message.includes('profiles_username_key')) {
        setIsDuplicatedUsername(true);
      } else {
        alert(error.message);
      }
    }
    setLoading(false);

    if (!error) {
      navigate(-1);
    }
  };

  const isDisabledSubmit = !username || !gender;

  return (
    <MobileLayout justifyContent="flex-start" HeaderComponent={<ProfileHeader />}>
      <Form layout="vertical">
        <Form.Item>
          <AvatarSetter />
        </Form.Item>

        <Form.Item
          required
          hasFeedback={isDuplicatedUsername}
          validateStatus={isDuplicatedUsername ? 'error' : undefined}
          help={isDuplicatedUsername ? '이미 사용중인 닉네임입니다' : undefined}
          label={<Label>닉네임</Label>}
        >
          <Input type="text" name="nickname" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </Form.Item>

        <Form.Item required label={<Label>성별</Label>}>
          <Radio.Group value={gender} onChange={(e) => setGender(e.target.value)}>
            <Radio value="M">
              <Label>남성</Label>
            </Radio>
            <Radio value="F">
              <Label>여성</Label>
            </Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={isDisabledSubmit}
            loading={isLoading}
            onClick={updateProfile}
          >
            저장
          </Button>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            ghost
            size="small"
            htmlType="button"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
          >
            로그아웃
          </Button>
        </Form.Item>
      </Form>
    </MobileLayout>
  );
}

// Form.Item의 라벨은 style={{color: 색상}}으로 폰트색이 바뀌지 않아서 span 태그로 대체해서 사용
const Label = styled.span`
  color: white;
`;
