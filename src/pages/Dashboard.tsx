import { Box } from '@mui/material';
import PipelineStepper from '../components/PipelineStepper';
import { useTransformPipeline } from '../hooks/useTransformPipeline';

export default function Dashboard() {
  const pipeline = useTransformPipeline();

  return (
    <Box>
      <PipelineStepper pipeline={pipeline} />
    </Box>
  );
}
