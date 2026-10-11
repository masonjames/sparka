import { getInstanceByDom } from "echarts";

/* oxlint-disable typescript/strict-boolean-expressions -- This value-producing condition preserves the current nullish/empty sentinel behavior; coercing it would change the returned value. */
export const chartsFinished = (
  container: Readonly<Pick<HTMLElement, "querySelectorAll">>
): boolean => {
  const charts = container.querySelectorAll<HTMLElement>(
    "[_echarts_instance_]"
  );
  return (
    charts.length > 0 &&
    [...charts].every((element) =>
      getInstanceByDom(element)?.getZr().animation.isFinished()
    )
  );
};
/* oxlint-enable typescript/strict-boolean-expressions */
