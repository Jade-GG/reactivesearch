import { Actions, helper } from '@appbaseio/reactivecore';
import { componentTypes } from '@appbaseio/reactivecore/lib/utils/constants';
import { replaceDiacritics } from '@appbaseio/reactivecore/lib/utils/suggestions';
import VueTypes from 'vue-types';
import ComponentWrapper from '../basic/ComponentWrapper.jsx';
import PreferencesConsumer from '../basic/PreferencesConsumer.jsx';
import Title from '../../styles/Title';
import Input from '../../styles/Input';
import Container from '../../styles/Container';
import {
	isEvent,
	parseValueArray,
	connect,
	hasCustomRenderer,
	getComponent,
	isFunction,
	updateCustomQuery,
	updateDefaultQuery,
	isQueryIdentical,
} from '../../utils/index';
import types from '../../utils/vueTypes';
import { UL, Checkbox } from '../../styles/FormControlList';
import { getAggsQuery } from './utils';

const { updateQuery, setQueryOptions, setCustomQuery, setDefaultQuery } = Actions;
const {
	isEqual,
	getQueryOptions,
	checkValueChange,
	getClassName,
	extractQueryFromCustomQuery,
	getOptionsForCustomQuery,
} = helper;

const MultiList = {
	name: 'MultiList',
	props: {
		defaultValue: types.stringArray,
		value: types.stringArray,
		queryFormat: VueTypes.oneOf(['and', 'or']).def('or'),
		showCheckbox: VueTypes.bool.def(true),
		beforeValueChange: types.func,
		className: VueTypes.string.def(''),
		componentId: types.stringRequired,
		compoundClause: types.compoundClause,
		customQuery: types.func,
		dataField: types.stringRequired,
		defaultQuery: types.func,
		filterLabel: types.string,
		innerClass: types.style,
		placeholder: VueTypes.string.def('Search'),
		react: types.react,
		render: types.func,
		renderItem: types.func,
		renderError: types.title,
		renderNoResults: VueTypes.any,
		transformData: types.func,
		selectAllLabel: types.string,
		showCount: VueTypes.bool.def(true),
		showFilter: VueTypes.bool.def(true),
		showSearch: VueTypes.bool.def(true),
		size: VueTypes.number,
		sortBy: VueTypes.oneOf(['asc', 'desc', 'count']).def('count'),
		title: types.title,
		URLParams: VueTypes.bool.def(false),
		showMissing: VueTypes.bool.def(false),
		missingLabel: VueTypes.string.def('N/A'),
		nestedField: types.string,
		index: VueTypes.string,
		endpoint: types.endpointConfig,
	},
	data() {
		const props = this.$props;
		this.__state = {
			currentValue: {},
			modifiedOptions: [],
			searchTerm: '',
		};
		this.internalComponent = `${props.componentId}__internal`;
		return this.__state;
	},
	created() {
		const props = this.$props;
		this.modifiedOptions
			= this.options && this.options[props.dataField]
				? this.options[props.dataField].buckets
				: [];
		// Set custom and default queries in store
		updateCustomQuery(this.componentId, this.setCustomQuery, this.$props, this.currentValue);
		updateDefaultQuery(this.componentId, this.setDefaultQuery, this.$props, this.currentValue);
		this.updateQueryHandlerOptions(this.$props);
		const value = this.selectedValue || this.$props.value || this.$props.defaultValue;
		this.setValue(value, !this.selectedValue);
	},
	mounted() {
		const currentValue = Object.keys(this.$data.currentValue);
		if (this.$props.value !== undefined && !isEqual(this.$props.value, currentValue)) {
			this.$emit('change', currentValue);
		}
	},
	watch: {
		options(newVal) {
			if (newVal) {
				this.modifiedOptions = newVal[this.$props.dataField]
					? newVal[this.$props.dataField].buckets
					: [];
			}
		},
		size() {
			this.updateQueryHandlerOptions(this.$props);
		},
		sortBy() {
			this.updateQueryHandlerOptions(this.$props);
		},
		dataField() {
			this.updateQueryHandlerOptions(this.$props);
			this.updateQueryHandler(this.$data.currentValue, this.$props);
		},
		value(newVal, oldVal) {
			if (!isEqual(oldVal, newVal)) {
				this.setValue(newVal, true);
			}
		},
		defaultValue(newVal, oldVal) {
			if (!isEqual(oldVal, newVal)) {
				this.setValue(newVal, true);
			}
		},
		selectedValue(newVal) {
			let selectedValue = Object.keys(this.$data.currentValue);
			if (this.$props.selectAllLabel) {
				selectedValue = selectedValue.filter((val) => val !== this.$props.selectAllLabel);

				if (this.$data.currentValue[this.$props.selectAllLabel]) {
					selectedValue = [this.$props.selectAllLabel];
				}
			}

			if (!isEqual(selectedValue, newVal)) {
				if (this.value === undefined) {
					this.setValue(newVal, true);
				} else {
					this.$emit('change', newVal);
				}
			}
		},
		defaultQuery(newVal, oldVal) {
			if (!isQueryIdentical(newVal, oldVal, this.$data.currentValue, this.$props)) {
				this.updateDefaultQueryHandler(this.$data.currentValue, this.$props);
			}
		},
		customQuery(newVal, oldVal) {
			if (!isQueryIdentical(newVal, oldVal, this.$data.currentValue, this.$props)) {
				this.updateQueryHandler(this.componentId, this.$data.currentValue, this.$props);
			}
		},
	},
	render() {
		const { selectAllLabel, renderItem, renderError } = this.$props;

		const renderItemCalc = this.$slots.renderItem || renderItem;
		const renderErrorCalc = this.$slots.renderError || renderError;

		if (renderErrorCalc && this.error) {
			return isFunction(renderErrorCalc) ? renderErrorCalc(this.error) : renderErrorCalc;
		}

		if (!this.hasCustomRenderer && this.modifiedOptions.length === 0 && !this.isLoading) {
			if (this.renderNoResults) {
				this.renderNoResult();
			} else {
				return null;
			}
		}
		let itemsToRender = this.$data.modifiedOptions;
		if (this.$props.transformData) {
			itemsToRender = this.$props.transformData(itemsToRender);
		}

		const filteredItemsToRender = itemsToRender.filter((item) => {
			if (String(item.key).length) {
				if (this.$props.showSearch && this.$data.searchTerm) {
					return replaceDiacritics(String(item.key))
						.toLowerCase()
						.includes(replaceDiacritics(this.$data.searchTerm).toLowerCase());
				}
				return true;
			}
			return false;
		});

		return (
			<Container class={this.$props.className}>
				{this.$props.title && (
					<Title class={getClassName(this.$props.innerClass, 'title')}>
						{this.$props.title}
					</Title>
				)}
				{this.renderSearch()}
				{this.hasCustomRenderer ? (
					this.getComponent()
				) : (
					<UL>
						{selectAllLabel ? (
							<li
								key={selectAllLabel}
								class={`${this.currentValue[selectAllLabel] ? 'active' : ''}`}
							>
								<Checkbox
									type="checkbox"
									class={getClassName(this.$props.innerClass, 'checkbox')}
									id={`${this.$props.componentId}-${selectAllLabel}`}
									name={selectAllLabel}
									value={selectAllLabel}
									onClick={this.handleClick}
									checked={!!this.currentValue[selectAllLabel]}
									show={this.$props.showCheckbox}
								/>
								<label
									class={getClassName(this.$props.innerClass, 'label')}
									for={`${this.$props.componentId}-${selectAllLabel}`}
								>
									<span>
										{selectAllLabel}
										{this.$props.showCount && (
											<span
												class={getClassName(
													this.$props.innerClass,
													'count',
												)}
											>
												&nbsp;(
												{this.totalDocumentCount})
											</span>
										)}
									</span>
								</label>
							</li>
						) : null}
						{!this.hasCustomRenderer
						&& filteredItemsToRender.length === 0
						&& !this.isLoading
							? this.renderNoResult()
							: filteredItemsToRender.map((item) => (
								<li
									key={item.key}
									class={`${
										this.$data.currentValue[item.key] ? 'active' : ''
									}`}
								>
									<Checkbox
										type="checkbox"
										class={getClassName(this.$props.innerClass, 'checkbox')}
										id={`${this.$props.componentId}-${item.key}`}
										name={this.$props.componentId}
										value={item.key}
										onClick={this.handleClick}
										show={this.$props.showCheckbox}
										checked={!!this.$data.currentValue[item.key]}
									/>
									<label
										class={getClassName(this.$props.innerClass, 'label')}
										for={`${this.$props.componentId}-${item.key}`}
									>
										{renderItemCalc ? (
											renderItemCalc({
												label: item.key,
												count: item.doc_count,
												isChecked: !!this.$data.currentValue[item.key],
											})
										) : (
											<span>
												{item.key}
												{this.$props.showCount && (
													<span
														class={getClassName(
															this.$props.innerClass,
															'count',
														)}
													>
															&nbsp;(
														{item.doc_count})
													</span>
												)}
											</span>
										)}
									</label>
								</li>
							  ))}
					</UL>
				)}
			</Container>
		);
	},

	methods: {
		setValue(value, isDefaultValue = false, props = this.$props) {
			const { selectAllLabel } = this.$props;
			let { currentValue } = this.$data;
			let finalValues = null;
			if (
				selectAllLabel
				&& ((Array.isArray(value) && value.includes(selectAllLabel))
					|| (typeof value === 'string' && value === selectAllLabel))
			) {
				if (currentValue[selectAllLabel]) {
					currentValue = {};
					finalValues = [];
				} else {
					this.$data.modifiedOptions.forEach((item) => {
						currentValue[item.key] = true;
					});
					currentValue[selectAllLabel] = true;
					finalValues = [selectAllLabel];
				}
			} else if (isDefaultValue) {
				finalValues = value;
				currentValue = {};

				if (value && value.length) {
					value.forEach((item) => {
						currentValue[item] = true;
					});
				}

				if (selectAllLabel && selectAllLabel in currentValue) {
					const { [selectAllLabel]: del, ...obj } = currentValue;
					currentValue = {
						...obj,
					};
				}
			} else {
				if (currentValue[value]) {
					const { [value]: del, ...rest } = currentValue;
					currentValue = {
						...rest,
					};
				} else if (Array.isArray(value)) {
					value.forEach((val) => {
						currentValue[val] = true;
					});
				} else {
					currentValue[value] = true;
				}

				if (selectAllLabel && selectAllLabel in currentValue) {
					const { [selectAllLabel]: del, ...obj } = currentValue;
					currentValue = {
						...obj,
					};
				}

				finalValues = Object.keys(currentValue);
			}

			const performUpdate = () => {
				this.currentValue = Object.assign({}, currentValue);
				this.updateQueryHandler(finalValues, props);
				this.$emit('valueChange', finalValues);
				this.$emit('value-change', finalValues);
			};
			checkValueChange(
				props.componentId,
				finalValues,
				props.beforeValueChange,
				performUpdate,
			);
		},

		updateDefaultQueryHandler(value, props) {
			let query = MultiList.defaultQuery(value, props);
			if (this.defaultQuery) {
				const defaultQueryToBeSet = this.defaultQuery(value, props) || {};
				const defaultQueryObj = extractQueryFromCustomQuery(defaultQueryToBeSet);
				if (defaultQueryObj) {
					query = defaultQueryObj;
				}

				// Update calculated default query in store
				updateDefaultQuery(props.componentId, this.setDefaultQuery, props, value);

				const defaultQueryOptions = getOptionsForCustomQuery(defaultQueryToBeSet);
				this.setQueryOptions(this.internalComponent, defaultQueryOptions, false);
			}
			this.updateQuery({
				componentId: this.internalComponent,
				query,
				value,
				componentType: componentTypes.multiList,
			});
		},

		updateQueryHandler(value, props) {
			const { customQuery } = props;
			let query = MultiList.defaultQuery(value, props);
			if (customQuery) {
				const customQueryCalc = customQuery(value, props);
				query = extractQueryFromCustomQuery(customQueryCalc);
				updateCustomQuery(props.componentId, this.setCustomQuery, props, value);

				const customQueryOptions = getOptionsForCustomQuery(customQueryCalc);
				this.setQueryOptions(props.componentId, customQueryOptions, false);
			}

			this.updateQuery({
				componentId: props.componentId,
				query,
				value,
				label: props.filterLabel,
				showFilter: props.showFilter,
				URLParams: props.URLParams,
				componentType: componentTypes.multiList,
			});
		},

		generateQueryOptions(props) {
			const queryOptions = getQueryOptions(props);
			return getAggsQuery(queryOptions, props);
		},

		updateQueryHandlerOptions(props) {
			const queryOptions = MultiList.generateQueryOptions(props);
			if (props.defaultQuery) {
				const value = Object.keys(this.$data.currentValue);
				const defaultQueryOptions = getOptionsForCustomQuery(
					props.defaultQuery(value, props),
				);
				this.setQueryOptions(this.internalComponent, {
					...queryOptions,
					...defaultQueryOptions,
				});
			} else {
				this.setQueryOptions(this.internalComponent, queryOptions);
			}
		},

		handleInputChange(e) {
			const { value } = e.target;
			this.searchTerm = value;
		},

		renderSearch() {
			if (this.$props.showSearch) {
				return (
					<Input
						class={getClassName(this.$props.innerClass, 'input') || ''}
						onInput={this.handleInputChange}
						value={this.$data.searchTerm}
						placeholder={this.$props.placeholder}
						style={{
							margin: '0 0 8px',
						}}
						themePreset={this.$props.themePreset}
					/>
				);
			}

			return null;
		},

		handleClick(e) {
			let currentValue = e;
			if (isEvent(e)) {
				currentValue = e.target.value;
			}
			const { value } = this.$props;
			if (value === undefined) {
				this.setValue(currentValue);
			} else {
				const values = parseValueArray(value || [], currentValue);
				this.$emit('change', values);
			}
		},
		getComponent() {
			const { currentValue, modifiedOptions } = this.$data;
			const { transformData } = this.$props;
			let itemsToRender = modifiedOptions;
			if (transformData) {
				itemsToRender = transformData(itemsToRender);
			}
			const data = {
				error: this.error,
				loading: this.isLoading,
				value: currentValue,
				data: itemsToRender,
				rawData: this.rawData,
				handleChange: this.handleClick,
			};
			return getComponent(data, this);
		},

		renderNoResult() {
			const renderNoResults = this.$slots.renderNoResults || this.$props.renderNoResults;
			return (
				<p class={getClassName(this.$props.innerClass, 'noResults') || null}>
					{isFunction(renderNoResults) ? renderNoResults() : renderNoResults}
				</p>
			);
		},
	},
	computed: {
		hasCustomRenderer() {
			return hasCustomRenderer(this);
		},
	},
};
MultiList.defaultQuery = (value, props) => ({
	query: {
		queryFormat: props.queryFormat,
		dataField: props.dataField,
		value,
		nestedField: props.nestedField,
		selectAllLabel: props.selectAllLabel,
		showMissing: props.showMissing,
	},
});
MultiList.generateQueryOptions = (props) => {
	const queryOptions = getQueryOptions(props);
	return getAggsQuery(queryOptions, props);
};
const mapStateToProps = (state, props) => ({
	options:
		props.nestedField && state.aggregations[props.componentId]
			? state.aggregations[props.componentId].reactivesearch_nested
			: state.aggregations[props.componentId],
	rawData: state.rawData[props.componentId],
	isLoading: state.isLoading[props.componentId],
	selectedValue:
		(state.selectedValues[props.componentId]
			&& state.selectedValues[props.componentId].value)
		|| null,
	themePreset: state.config.themePreset,
	totalDocumentCount: state.hits[props.componentId] && state.hits[props.componentId].total,
	error: state.error[props.componentId],
	componentProps: state.props[props.componentId],
});

const mapDispatchtoProps = {
	setQueryOptions,
	updateQuery,
	setCustomQuery,
	setDefaultQuery,
};

MultiList.hasInternalComponent = () => true;

export const ListConnected = PreferencesConsumer(
	ComponentWrapper(connect(mapStateToProps, mapDispatchtoProps)(MultiList), {
		componentType: componentTypes.multiList,
		internalComponent: MultiList.hasInternalComponent(),
	}),
);
ListConnected.name = MultiList.name;
ListConnected.defaultQuery = MultiList.defaultQuery;
ListConnected.generateQueryOptions = MultiList.generateQueryOptions;
ListConnected.hasInternalComponent = MultiList.hasInternalComponent;
// Add componentType for SSR
ListConnected.componentType = componentTypes.multiList;

ListConnected.install = function (Vue) {
	Vue.component(ListConnected.name, ListConnected);
};

export default ListConnected;
