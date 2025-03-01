import VueTypes from 'vue-types';
import { Actions, helper } from '@appbaseio/reactivecore';
import { componentTypes } from '@appbaseio/reactivecore/lib/utils/constants';
// eslint-disable-next-line import/extensions
import VueSlider from 'vue-slider-component/dist-css/vue-slider-component.umd.min.js'
import 'vue-slider-component/dist-css/vue-slider-component.css'
import 'vue-slider-component/theme/default.css'
import Container from '../../styles/Container';
import { connect, updateCustomQuery, isQueryIdentical } from '../../utils/index';
import ComponentWrapper from '../basic/ComponentWrapper.jsx';
import NoSSR from '../basic/NoSSR.jsx';
import PreferencesConsumer from '../basic/PreferencesConsumer.jsx';
import Title from '../../styles/Title';
import Slider from '../../styles/Slider';
import types from '../../utils/vueTypes';
import { getComponents } from './addons/ssr';

const { updateQuery, setQueryOptions, setCustomQuery } = Actions;

const { checkValueChange, getClassName, getOptionsFromQuery, isEqual } = helper;

const RangeSlider = {
	name: 'RangeSlider',
	components: getComponents(),
	inject: {
		theme: {
			from: 'theme_reactivesearch',
		},
	},
	data() {
		const state = {
			currentValue: this.$props.range ? [this.$props.range.start, this.$props.range.end] : [],
			stats: [],
		};
		return state;
	},
	props: {
		beforeValueChange: types.func,
		className: VueTypes.string.def(''),
		range: VueTypes.shape({
			start: VueTypes.integer.def(0),
			end: VueTypes.integer.def(10),
		}),
		rangeLabels: types.rangeLabels,
		componentId: types.stringRequired,
		compoundClause: types.compoundClause,
		customQuery: types.func,
		data: types.data,
		dataField: types.stringRequired,
		defaultValue: types.range,
		value: types.range,
		filterLabel: types.string,
		innerClass: types.style,
		react: types.react,
		showFilter: VueTypes.bool.def(true),
		showCheckbox: VueTypes.bool.def(true),
		title: types.title,
		URLParams: VueTypes.bool.def(false),
		sliderOptions: VueTypes.object.def({}),
		nestedField: types.string,
		index: VueTypes.string,
		endpoint: types.endpointConfig,
	},

	methods: {
		handleSliderChange(values) {
			const { value } = this.$props;
			if (value === undefined) {
				this.handleChange(values);
			} else {
				this.$emit('change', {
					start: values[0],
					end: values[1],
				});
			}
		},
		handleSlider() {
			const sliderValues = this.$refs.slider.getValue();
			this.handleSliderChange(sliderValues);
		},
		handleChange(currentValue, props = this.$props) {
			const performUpdate = () => {
				this.currentValue = currentValue;
				this.updateQueryHandler([currentValue[0], currentValue[1]], props);
				this.$emit('valueChange', { start: currentValue[0], end: currentValue[1] });
				this.$emit('value-change', { start: currentValue[0], end: currentValue[1] });
			};

			checkValueChange(
				props.componentId,
				{
					start: currentValue[0],
					end: currentValue[1],
				},
				props.beforeValueChange,
				performUpdate,
			);
		},

		updateQueryHandler(value, props) {
			const { customQuery } = props;
			let query = RangeSlider.defaultQuery(value, props);
			if (customQuery) {
				({ query } = customQuery(value, props) || {});
				const customQueryOptions = getOptionsFromQuery(customQuery(value, props));
				updateCustomQuery(
					this.componentId,
					this.setCustomQuery,
					this.$props,
					this.currentValue,
				);
				this.setQueryOptions(props.componentId, customQueryOptions, false);
			}
			const {
				showFilter,
				range: { start, end },
			} = props;
			const [currentStart, currentEnd] = value;
			// check if the slider is at its initial position
			const isInitialValue = currentStart === start && currentEnd === end;
			this.updateQuery({
				componentId: props.componentId,
				query,
				value,
				label: props.filterLabel,
				showFilter: showFilter && !isInitialValue,
				URLParams: props.URLParams,
				componentType: componentTypes.rangeSlider,
			});
		},
	},
	watch: {
		defaultValue(newVal) {
			this.handleChange(RangeSlider.parseValue(newVal, this.$props));
		},

		value(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.handleChange(RangeSlider.parseValue(newVal, this.$props));
			}
		},

		selectedValue(newVal) {
			if (!isEqual(this.$data.currentValue, newVal)) {
				this.handleChange(RangeSlider.parseValue(newVal, this.$props));
				this.$emit('change', newVal);
			}
		},

		customQuery(newVal, oldVal) {
			if (!isQueryIdentical(newVal, oldVal, this.$data.currentValue, this.$props)) {
				this.updateQueryHandler(this.$data.currentValue, this.$props);
			}
		},
	},

	created() {
		if (!this.$props.range) {
			console.error(
				'%crange is not defined. Read more about this at https://opensource.appbase.io/reactive-manual/vue/range-components/rangeslider.html#props',
				'font-size: 12.5px;',
			);
		}

		// Set custom query in store
		updateCustomQuery(this.componentId, this.setCustomQuery, this.$props, this.currentValue);
		const { value, defaultValue } = this.$props;
		const { selectedValue } = this;
		if (this.$props.range) {
			if (Array.isArray(selectedValue)) {
				this.handleChange(selectedValue);
			} else if (selectedValue) {
				this.handleChange(RangeSlider.parseValue(selectedValue, this.$props));
			} else if (value) {
				this.handleChange(RangeSlider.parseValue(value, this.$props));
			} else if (defaultValue) {
				this.handleChange(RangeSlider.parseValue(defaultValue, this.$props));
			}
		}
	},
	render() {
		return (
			<Container class={this.$props.className}>
				{this.$props.title && (
					<Title class={getClassName(this.$props.innerClass, 'title')}>
						{this.$props.title}
					</Title>
				)}
				{this.$props.range ? (
					<NoSSR>
						<Slider class={getClassName(this.$props.innerClass, 'slider')}>
							<VueSlider
								ref="slider"
								modelValue={this.currentValue}
								min={this.$props.range.start}
								max={this.$props.range.end}
								dotSize={20}
								height={4}
								enable-cross={false}
								onDrag-end={this.handleSlider}
								tooltip="always"
								{...this.$props.sliderOptions}
							/>
							{this.$props.rangeLabels && (
								<div class="label-container">
									<label
										class={
											getClassName(this.$props.innerClass, 'label')
											|| 'range-label-left'
										}
									>
										{this.$props.rangeLabels.start}
									</label>
									<label
										class={
											getClassName(this.$props.innerClass, 'label')
											|| 'range-label-right'
										}
									>
										{this.$props.rangeLabels.end}
									</label>
								</div>
							)}
						</Slider>
					</NoSSR>
				) : null}
			</Container>
		);
	},
};

RangeSlider.defaultQuery = (value, props) => ({
	query: {
		queryFormat: props.queryFormat,
		dataField: props.dataField,
		value,
		showMissing: props.showMissing,
	},
});

RangeSlider.parseValue = (value, props) => {
	if (value) {
		return Array.isArray(value) ? value : [value.start, value.end];
	}
	if (props.range) {
		return [props.range.start, props.range.end];
	}
	return [];
};

const mapStateToProps = (state, props) => ({
	options: state.aggregations[props.componentId]
		? state.aggregations[props.componentId][props.dataField]
		  && state.aggregations[props.componentId][props.dataField].buckets // eslint-disable-line
		: [],
	selectedValue: state.selectedValues[props.componentId]
		? state.selectedValues[props.componentId].value
		: null,
	componentProps: state.props[props.componentId],
});

const mapDispatchtoProps = {
	updateQuery,
	setQueryOptions,
	setCustomQuery,
};

export const RangeConnected = PreferencesConsumer(
	ComponentWrapper(connect(mapStateToProps, mapDispatchtoProps)(RangeSlider), {
		componentType: componentTypes.rangeSlider,
	}),
);
RangeConnected.name = RangeSlider.name;

RangeConnected.defaultQuery = RangeSlider.defaultQuery;
RangeConnected.parseValue = RangeSlider.parseValue;
RangeConnected.hasInternalComponent = RangeSlider.hasInternalComponent;

RangeConnected.install = function (Vue) {
	Vue.component(RangeConnected.name, RangeConnected);
};

// Add componentType for SSR
RangeConnected.componentType = componentTypes.rangeSlider;

export default RangeConnected;
